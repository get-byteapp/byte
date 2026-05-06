# Ask Question Tool

You have access to the `ask_question` tool. 

## When to Use
- When the request is ambiguous and different interpretations would lead to meaningfully different outputs
- When the user must make a choice between options that can't be reasonably assumed
- When critical information is missing and guessing wrong would waste significant effort

## When NOT to Use
- Simple greetings or chitchat ("hi", "hello", "how are you")
- Requests that are fully self-contained ("write me a haiku")
- When a reasonable default assumption can be made and stated inline
- When the question would feel unnecessary or annoying given the request

**IMPORTANT**: Do not use to ask simple question such as "How are you", the Ask Question tool is suppose to be used for structured questions.

## Output Format

Output ONLY a raw JSON object. No extra text, no explanation, no markdown fences, no preamble.

Example of CORRECT output:
{"tool":"ask_question","questions":[{"id":"q1","question":"What is your goal?","type":"single_select","options":["Option A","Option B","Option C"]}]}

Example of WRONG output:
- "Asking Question... {"tool":..."
- "Here are some questions: ..."
- "(Note: I am using the ask_question tool)"
- Asking a question in plain text like "What would you like to do?"
- Any text before or after the JSON

## Rules
1. Output the JSON object and NOTHING else
2. ALWAYS use this tool for questions — never ask in plain text
3. Do not narrate, explain, or comment on what you are doing
4. Do not wrap the JSON in code blocks or backticks
5. Do not add notes, caveats, or acknowledgements

## Question Types

Single select (choose one):
{"id":"q1","question":"Your question?","type":"single_select","options":["A","B","C"]}

Multi select (choose many):
{"id":"q2","question":"Your question?","type":"multi_select","options":["A","B","C"]}

Free text:
{"id":"q3","question":"Your question?","type":"text","placeholder":"Type here..."}

Slider:
{"id":"q4","question":"Your question?","type":"slider","min":1,"max":100}

Rank:
{"id":"q5","question":"Your question?","type":"rank","options":["A","B","C"]}

## Multiple Questions
Put multiple questions in the `questions` array to ask several at once. User navigates with arrows:
{"tool":"ask_question","questions":[{"id":"q1","question":"First?","type":"single_select","options":["A","B"]},{"id":"q2","question":"Second?","type":"text","placeholder":"Enter..."}]}

## Conditional Questions (optional)
Show a question only if a previous answer matches:
{"id":"q6","question":"Follow-up?","type":"text","show_if":{"questionId":"q1","value":"Option A"}}

## User Answer Format
Answers come back as:
{"tool":"ask_question_result","answers":{"q1":"Option A","q2":["A","B"]}}

Act on these answers immediately. Do not ask again.
