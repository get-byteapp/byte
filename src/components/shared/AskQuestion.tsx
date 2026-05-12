import { useState, useMemo, useRef, useEffect } from 'react'
import { Pencil, Check } from 'lucide-react'
import type { Question, AskQuestionPayload } from '../../types'
import './AskQuestion.css'

interface AskQuestionProps {
  payload: AskQuestionPayload;
  onComplete: (answers: Record<string, string | string[] | number>) => void;
  onCancel: () => void;
}

export function AskQuestion({ payload, onComplete, onCancel }: AskQuestionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(-1);
  const [customInputValue, setCustomInputValue] = useState('');
  const [multiCustomInputValue, setMultiCustomInputValue] = useState('');
  const [rankedItems, setRankedItems] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const multiCustomInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter visible questions based on show_if conditions
  const visibleQuestions = useMemo(() => {
    const visible: Question[] = [];
    
    for (const q of payload.questions) {
      if (!q.show_if) {
        visible.push(q);
      } else {
        const prevAnswer = answers[q.show_if.questionId];
        const shouldShow = Array.isArray(q.show_if.value)
          ? (Array.isArray(prevAnswer) ? prevAnswer.includes(q.show_if.value[0]) : prevAnswer === q.show_if.value[0])
          : prevAnswer === q.show_if.value;
        
        if (shouldShow) {
          visible.push(q);
        }
      }
    }
    
    return visible;
  }, [payload.questions, answers]);

  const currentQuestion = visibleQuestions[currentIndex];

  // Initialize ranked items when rank question is shown
  useEffect(() => {
    if (currentQuestion?.type === 'rank' && currentQuestion.options) {
      setRankedItems([...currentQuestion.options]);
    }
  }, [currentQuestion?.id]);

  // Focus overlay on mount for keyboard navigation
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Reset state when moving to next question
  useEffect(() => {
    setSelectedOptionIndex(-1);
    setCustomInputValue('');
  }, [currentIndex]);

  const handleAnswer = (value: string | string[] | number) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    // Move to next visible question
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowConfirm(true);
    }
  };

  const handleClose = () => {
    onCancel();
  };

  const handleConfirm = () => {
    onComplete(answers);
  };

  const handleBackToQuestions = () => {
    setShowConfirm(false);
    setCurrentIndex(0);
  };

  // Drag and drop for rank
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newItems = [...rankedItems];
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setRankedItems(newItems);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleRankConfirm = () => {
    setAnswers({ ...answers, [currentQuestion.id]: rankedItems });
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowConfirm(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
    
    // Arrow left/right to navigate between questions
    if (!showConfirm && visibleQuestions.length > 1) {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < visibleQuestions.length - 1) {
        e.preventDefault();
        setCurrentIndex(currentIndex + 1);
      }
    }
    
    if (!showConfirm && currentQuestion?.type === 'single_select') {
      const optionCount = (currentQuestion.options?.length || 0) + 1;
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedOptionIndex(prev => (prev <= 0 ? optionCount - 1 : prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedOptionIndex(prev => (prev >= optionCount - 1 ? 0 : prev + 1));
      } else if (e.key === 'Enter' && selectedOptionIndex >= 0) {
        e.preventDefault();
        if (selectedOptionIndex < (currentQuestion.options?.length || 0)) {
          handleAnswer(currentQuestion.options![selectedOptionIndex]);
        } else {
          if (customInputValue) {
            handleAnswer(`custom-${customInputValue}`);
          }
        }
      }
    }
  };

  const renderEnterIcon = () => (
    <div className="aq-enter-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 10 4 15 9 20"></polyline>
        <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
      </svg>
    </div>
  );

  const renderCloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  if (!currentQuestion && !showConfirm) return null;

  return (
    <div 
      ref={overlayRef}
      className="aq-overlay" 
      onKeyDown={handleKeyDown} 
      role="alertdialog" 
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      <div className="aq-modal-wrapper">
        <div className="aq-modal">
        {/* Header */}
        <div className="aq-header">
          <div className="aq-question-text">
            {!showConfirm ? currentQuestion?.question : "Confirm your answers"}
          </div>
          {/* Question counter when multiple */}
          {!showConfirm && visibleQuestions.length > 1 && (
            <div className="aq-question-counter">{currentIndex + 1}/{visibleQuestions.length}</div>
          )}
          <button className="aq-close-btn" onClick={handleClose}>
            {renderCloseIcon()}
          </button>
        </div>

        {/* AI Context/Comment */}
        {!showConfirm && payload.comment && (
          <div className="aq-comment">{payload.comment}</div>
        )}

        {!showConfirm ? (
          <>
            <div className="aq-options-list">
              {/* SINGLE SELECT */}
              {currentQuestion?.type === 'single_select' && (
                <>
                  {currentQuestion.options?.map((option, idx) => (
                    <button
                      key={option}
                      className={`aq-option-button ${selectedOptionIndex === idx ? 'aq-hovered' : ''}`}
                      onClick={() => handleAnswer(option)}
                      onMouseEnter={() => setSelectedOptionIndex(idx)}
                    >
                      <span className="aq-option-badge">{idx + 1}</span>
                      <span className="aq-option-label">{option}</span>
                      {renderEnterIcon()}
                    </button>
                  ))}
                  
                  {/* Something else option */}
                  <button
                    className={`aq-option-button ${selectedOptionIndex === (currentQuestion.options?.length || 0) ? 'aq-hovered' : ''}`}
                    onMouseEnter={() => setSelectedOptionIndex(currentQuestion.options?.length || 0)}
                    onClick={() => customInputRef.current?.focus()}
                  >
                    <span className="aq-option-badge"><Pencil size={14} /></span>
                    <input
                      ref={customInputRef}
                      type="text"
                      className="aq-something-else-input"
                      placeholder="Something else"
                      value={customInputValue}
                      onChange={(e) => setCustomInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customInputValue) {
                          handleAnswer(`custom-${customInputValue}`);
                        }
                      }}
                    />
                    {renderEnterIcon()}
                  </button>
                </>
              )}

              {/* MULTI SELECT - same style as single select */}
              {currentQuestion?.type === 'multi_select' && (
                <>
                  {currentQuestion.options?.map((option, idx) => {
                    const isSelected = Array.isArray(answers[currentQuestion.id])
                      ? (answers[currentQuestion.id] as string[]).includes(option)
                      : false;
                    return (
                      <button
                        key={option}
                        className={`aq-option-button ${isSelected ? 'aq-selected' : ''} ${selectedOptionIndex === idx ? 'aq-hovered' : ''}`}
                        onClick={() => {
                          const current = Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]) : [];
                          const updated = isSelected ? current.filter((v) => v !== option) : [...current, option];
                          setAnswers({ ...answers, [currentQuestion.id]: updated });
                        }}
                        onMouseEnter={() => setSelectedOptionIndex(idx)}
                      >
                        <span className="aq-option-badge">{isSelected ? <Check size={14} /> : (idx + 1)}</span>
                        <span className="aq-option-label">{option}</span>
                      </button>
                    );
                  })}
                  
                  {/* Custom option for multi select */}
                  <button
                    className={`aq-option-button ${selectedOptionIndex === (currentQuestion.options?.length || 0) ? 'aq-hovered' : ''}`}
                    onMouseEnter={() => setSelectedOptionIndex(currentQuestion.options?.length || 0)}
                    onClick={() => {
                      if (multiCustomInputValue) {
                        const current = Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]) : [];
                        if (!current.includes(`custom-${multiCustomInputValue}`)) {
                          setAnswers({ ...answers, [currentQuestion.id]: [...current, `custom-${multiCustomInputValue}`] });
                        }
                        setMultiCustomInputValue('');
                      } else {
                        multiCustomInputRef.current?.focus();
                      }
                    }}
                  >
                    <span className="aq-option-badge"><Pencil size={14} /></span>
                    <input
                      ref={multiCustomInputRef}
                      type="text"
                      className="aq-something-else-input"
                      placeholder="Something else"
                      value={multiCustomInputValue}
                      onChange={(e) => setMultiCustomInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && multiCustomInputValue) {
                          e.stopPropagation();
                          const current = Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]) : [];
                          if (!current.includes(`custom-${multiCustomInputValue}`)) {
                            setAnswers({ ...answers, [currentQuestion.id]: [...current, `custom-${multiCustomInputValue}`] });
                          }
                          setMultiCustomInputValue('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                </>
              )}

              {/* SHORT TEXT - single line */}
              {currentQuestion?.type === 'short_text' && (
                <div className="aq-text-input-wrapper">
                  <input
                    type="text"
                    className="aq-text-input-field"
                    placeholder={currentQuestion.placeholder || 'Type a short answer...'}
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = answers[currentQuestion.id];
                        if (val && String(val).trim()) {
                          handleAnswer(String(val).trim());
                        }
                      }
                    }}
                    autoFocus
                  />
                  <div className="aq-text-input-hint">
                    {answers[currentQuestion.id] && String(answers[currentQuestion.id]).trim()
                      ? 'Press Enter to submit'
                      : 'Type your answer, then press Enter'}
                  </div>
                </div>
              )}

              {/* TEXT - long answer (textarea) */}
              {currentQuestion?.type === 'text' && (
                <div className="aq-text-input-wrapper">
                  <textarea
                    className="aq-text-input-field aq-textarea"
                    placeholder={currentQuestion.placeholder || 'Type your answer...'}
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const val = answers[currentQuestion.id];
                        if (val && String(val).trim()) {
                          handleAnswer(String(val).trim());
                        }
                      }
                    }}
                    autoFocus
                    rows={3}
                  />
                  <div className="aq-text-input-hint">
                    {answers[currentQuestion.id] && String(answers[currentQuestion.id]).trim()
                      ? 'Press Enter to submit · Shift+Enter for new line'
                      : 'Type your answer, then press Enter to submit'}
                  </div>
                </div>
              )}

              {/* SLIDER */}
              {currentQuestion?.type === 'slider' && (
                <div className="aq-slider-wrapper">
                  <div className="aq-slider-value">{answers[currentQuestion.id] || currentQuestion.min || 50}</div>
                  <input
                    type="range"
                    className="aq-slider-track"
                    min={currentQuestion.min || 1}
                    max={currentQuestion.max || 100}
                    value={(answers[currentQuestion.id] as number) || currentQuestion.min || 50}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: Number(e.target.value) })}
                  />
                  <div className="aq-slider-labels">
                    <span>{currentQuestion.min || 1}</span>
                    <span>{currentQuestion.max || 100}</span>
                  </div>
                  <div className="aq-slider-submit-hint">
                    <button className="aq-slider-confirm-btn" onClick={() => handleAnswer(answers[currentQuestion.id] || currentQuestion.min || 50)}>
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* RANK - drag to reorder */}
              {currentQuestion?.type === 'rank' && (
                <div className="aq-rank-wrapper">
                  <div className="aq-rank-instructions">Drag to reorder by priority (top = highest)</div>
                  <div className="aq-rank-list">
                    {rankedItems.map((option, idx) => (
                      <div 
                        key={option} 
                        className={`aq-rank-item ${dragIndex === idx ? 'aq-rank-dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className="aq-rank-position">{idx + 1}</span>
                        <span className="aq-rank-label">{option}</span>
                        <span className="aq-rank-grip">⋮⋮</span>
                      </div>
                    ))}
                  </div>
                  <div className="aq-rank-submit-hint">
                    <button className="aq-slider-confirm-btn" onClick={handleRankConfirm}>
                      Confirm Order
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="aq-modal-footer">
              {/* Far left: Back arrow - only show if multiple questions */}
              {visibleQuestions.length > 1 && (
                <button 
                  className="aq-footer-arrow" 
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  title="Previous (←)"
                >
                  ←
                </button>
              )}
              
              {/* Middle: Key hints */}
              <div className="aq-footer-hints">
                ← → navigate &nbsp;·&nbsp; Enter select &nbsp;·&nbsp; Esc skip
              </div>
              
              {/* Far right: Forward arrow - only show if multiple questions */}
              {visibleQuestions.length > 1 && (
                <button 
                  className="aq-footer-arrow" 
                  onClick={() => setCurrentIndex(Math.min(visibleQuestions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === visibleQuestions.length - 1}
                  title="Next (→)"
                >
                  →
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="aq-confirm-list">
              {visibleQuestions.map((q) => (
                <div key={q.id} className="aq-confirm-row">
                  <div className="aq-confirm-label">{q.question}</div>
                  <div className="aq-confirm-value">
                    {q.type === 'rank' ? (
                      <div className="aq-rank-confirm-list">
                        {((answers[q.id] as string[]) || currentQuestion?.options || []).map((item, idx) => (
                          <div key={item} className="aq-rank-confirm-item">
                            <span className="aq-rank-confirm-pos">{idx + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : Array.isArray(answers[q.id]) ? (
                      (answers[q.id] as string[]).join(', ')
                    ) : (
                      <span>{String(answers[q.id] || '—')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="aq-modal-footer">
              <button className="aq-back-button" onClick={handleBackToQuestions} style={{ marginRight: '12px' }}>← Back</button>
              <button className="aq-confirm-button" onClick={handleConfirm}>Confirm</button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
