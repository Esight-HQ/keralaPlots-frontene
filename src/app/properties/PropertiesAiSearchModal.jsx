"use client";

import styles from "./properties.module.css";

/* Split out of page.jsx so it loads as its own chunk, only when needed. */
export default function PropertiesAiSearchModal({
    changeSearchTerm,
    handleSuggestionSelect,
    searchTerm,
    setIsModalOpen,
    setSearchTerm,
    suggestions,
    typingSuggestions,
}) {
    return (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitleGroup}>
                        <div className={styles.modalSparkIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                        <h3 className={styles.modalTitle}>Ask AI Assistant</h3>
                    </div>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={() => setIsModalOpen(false)}
                        title="Close"
                    >
                        &times;
                    </button>
                </div>
        
                {/* Modal Search Input Box */}
                <div className={styles.modalSearchBox}>
                    <div className={styles.suggestionIcon}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => changeSearchTerm(e.target.value)}
                        placeholder='E.g. "Show me beachfront properties in Kochi under ₹1 Cr"'
                        className={styles.modalSearchInput}
                        autoFocus
                    />
                    <div className={styles.micIcon} title="Voice Search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </div>
                    <button
                        type="button"
                        className={styles.modalSubmitBtn}
                        onClick={() => setIsModalOpen(false)}
                    >
                        Search
                    </button>
                </div>
        
                {/* Autocomplete Typing Suggestions */}
                {typingSuggestions.length > 0 && (
                    <div className={styles.typingSuggestions}>
                        {typingSuggestions.map((phrase, index) => (
                            <button
                                key={index}
                                type="button"
                                className={styles.typingSuggestionItem}
                                onClick={() => {
                                    const cleanText = phrase.replace("Properties in ", "").replace(" listings", "");
                                    setSearchTerm(cleanText);
                                    setIsModalOpen(false);
                                }}
                            >
                                <span className={styles.typingSuggestionIcon}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </span>
                                <span>{phrase}</span>
                            </button>
                        ))}
                    </div>
                )}
        
                {/* Smart Suggestions List */}
                <div className={styles.suggestionSection}>
                    <span className={styles.suggestionLabel}>Try asking these:</span>
                    <div className={styles.suggestionGrid}>
                        {suggestions.map((phrase, index) => (
                            <button
                                key={index}
                                type="button"
                                className={styles.suggestionItem}
                                onClick={() => handleSuggestionSelect(phrase)}
                            >
                                <span className={styles.suggestionIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </span>
                                <span className={styles.suggestionText}>&quot;{phrase}&quot;</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
