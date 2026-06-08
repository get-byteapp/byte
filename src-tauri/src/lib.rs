use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use sysinfo::System;

fn get_project_dir(app: &tauri::AppHandle, project_id: &str) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    let dir = app_dir.join("projects").join(project_id);
    dir
}

#[tauri::command]
async fn get_ollama_model_details(base_url: String, model: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/show", base_url.trim_end_matches('/'));
    let body = serde_json::json!({ "model": model });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch model details: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API returned status: {}", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(json)
}

#[tauri::command]
fn save_project_file(
    app: tauri::AppHandle,
    project_id: String,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<String, String> {
    let dir = get_project_dir(&app, &project_id);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let file_path = dir.join(&file_name);
    fs::write(&file_path, &file_data).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_project_file(
    app: tauri::AppHandle,
    project_id: String,
    file_name: String,
) -> Result<Vec<u8>, String> {
    let dir = get_project_dir(&app, &project_id);
    let file_path = dir.join(&file_name);
    fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn delete_project_file(
    app: tauri::AppHandle,
    project_id: String,
    file_name: String,
) -> Result<(), String> {
    let dir = get_project_dir(&app, &project_id);
    let file_path = dir.join(&file_name);
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
fn list_project_files(app: tauri::AppHandle, project_id: String) -> Result<Vec<String>, String> {
    let dir = get_project_dir(&app, &project_id);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut files = vec![];
    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read directory: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_string());
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn get_system_specs() -> serde_json::Value {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    let cpu_cores = sys.cpus().len();

    let free_storage_gb = {
        let disks = sysinfo::Disks::new_with_refreshed_list();
        #[cfg(target_os = "windows")]
        let root = std::path::Path::new("C:\\");
        #[cfg(not(target_os = "windows"))]
        let root = std::path::Path::new("/");
        disks.iter()
            .find(|d| root.starts_with(d.mount_point()))
            .map(|d| d.available_space() as f64 / 1_073_741_824.0)
            .unwrap_or(0.0)
    };

    let platform = if cfg!(target_os = "macos") { "macos" }
        else if cfg!(target_os = "windows") { "windows" }
        else { "linux" };

    serde_json::json!({
        "totalRamGb": (total_ram_gb * 10.0).round() / 10.0,
        "freeStorageGb": (free_storage_gb * 10.0).round() / 10.0,
        "cpuCores": cpu_cores,
        "platform": platform,
    })
}

#[tauri::command]
async fn convert_file_markitdown(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<String, String> {
    let sidecar_command = app
        .shell()
        .sidecar("markitdown-sidecar")
        .map_err(|e| format!("Failed to find sidecar: {}", e))?
        .args([&file_path]);

    let output = sidecar_command
        .output()
        .await
        .map_err(|e| format!("Failed to run sidecar: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Sidecar exited with error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .build(),
        )
        .setup(|_app| {
            log::info!("Byte app started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_project_file,
            read_project_file,
            delete_project_file,
            list_project_files,
            get_ollama_model_details,
            convert_file_markitdown,
            get_system_specs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
