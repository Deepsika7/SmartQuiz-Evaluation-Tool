/**
 * Distraction Analysis Module
 * Tracks user focus, tab switches, idle time, and other activities during quiz attempts
 */

class DistractionAnalyzer {
    constructor() {
        this.isActive = false;
        this.attemptId = null;
        this.events = [];
        this.startTime = null;
        this.lastActivity = Date.now();
        this.tabSwitchCount = 0;
        this.idleTime = 0;
        this.totalIdleTime = 0;
        this.isIdle = false;
        this.isTabVisible = true;
        this.heartbeatInterval = null;
        this.idleCheckInterval = null;
        
        // Configuration
        this.config = {
            idleThreshold: 30000, // 30 seconds
            heartbeatInterval: 10000, // 10 seconds
            maxTabSwitches: 5,
            maxIdleTime: 120000, // 2 minutes
            alertDuration: 5000 // 5 seconds
        };
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize all event listeners for distraction detection
     */
    initializeEventListeners() {
        // Tab visibility change detection
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Window focus/blur detection
        window.addEventListener('focus', () => {
            this.handleWindowFocus();
        });
        
        window.addEventListener('blur', () => {
            this.handleWindowBlur();
        });
        
        // Activity detection (mouse and keyboard)
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.handleUserActivity();
            }, true);
        });
        
        // Prevent common cheating attempts
        document.addEventListener('contextmenu', (e) => {
            if (this.isActive) {
                e.preventDefault();
                this.logEvent('context_menu_blocked', { timestamp: Date.now() });
            }
        });
        
        // Detect developer tools (basic detection)
        let devtools = {
            open: false,
            orientation: null
        };
        
        setInterval(() => {
            if (this.isActive) {
                if (window.outerHeight - window.innerHeight > 200 || 
                    window.outerWidth - window.innerWidth > 200) {
                    if (!devtools.open) {
                        devtools.open = true;
                        this.logEvent('devtools_opened', { 
                            timestamp: Date.now(),
                            windowSize: {
                                outer: { width: window.outerWidth, height: window.outerHeight },
                                inner: { width: window.innerWidth, height: window.innerHeight }
                            }
                        });
                        this.showAlert('Developer tools detected!');
                    }
                } else {
                    devtools.open = false;
                }
            }
        }, 1000);
    }
    
    /**
     * Start monitoring for a quiz attempt
     */
    startMonitoring(attemptId) {
        this.isActive = true;
        this.attemptId = attemptId;
        this.startTime = Date.now();
        this.lastActivity = Date.now();
        this.events = [];
        this.tabSwitchCount = 0;
        this.totalIdleTime = 0;
        
        console.log('Distraction monitoring started for attempt:', attemptId);
        
        // Start heartbeat
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.heartbeatInterval);
        
        // Start idle checking
        this.idleCheckInterval = setInterval(() => {
            this.checkIdleStatus();
        }, 1000);
        
        // Log start event
        this.logEvent('monitoring_started', {
            attemptId: this.attemptId,
            timestamp: this.startTime,
            userAgent: navigator.userAgent,
            screenResolution: {
                width: screen.width,
                height: screen.height
            },
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isActive = false;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }
        
        // Log final summary
        this.logEvent('monitoring_stopped', {
            attemptId: this.attemptId,
            timestamp: Date.now(),
            duration: Date.now() - this.startTime,
            totalEvents: this.events.length,
            tabSwitchCount: this.tabSwitchCount,
            totalIdleTime: this.totalIdleTime,
            summary: this.generateSummary()
        });
        
        // Send final batch of events
        this.sendEventsToServer();
        
        console.log('Distraction monitoring stopped');
    }
    
    /**
     * Handle tab visibility change
     */
    handleVisibilityChange() {
        if (!this.isActive) return;
        
        const isVisible = !document.hidden;
        
        if (isVisible !== this.isTabVisible) {
            this.isTabVisible = isVisible;
            
            if (!isVisible) {
                this.tabSwitchCount++;
                this.logEvent('tab_switch_away', {
                    timestamp: Date.now(),
                    tabSwitchCount: this.tabSwitchCount
                });
                
                if (this.tabSwitchCount > this.config.maxTabSwitches) {
                    this.showAlert('Multiple tab switches detected! This may affect your quiz score.');
                }
            } else {
                this.logEvent('tab_switch_back', {
                    timestamp: Date.now(),
                    tabSwitchCount: this.tabSwitchCount
                });
            }
        }
    }
    
    /**
     * Handle window focus
     */
    handleWindowFocus() {
        if (!this.isActive) return;
        
        this.logEvent('window_focus', {
            timestamp: Date.now()
        });
        
        this.handleUserActivity();
    }
    
    /**
     * Handle window blur
     */
    handleWindowBlur() {
        if (!this.isActive) return;
        
        this.logEvent('window_blur', {
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle user activity
     */
    handleUserActivity() {
        if (!this.isActive) return;
        
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        
        if (this.isIdle && timeSinceLastActivity > 1000) {
            this.isIdle = false;
            this.logEvent('activity_resumed', {
                timestamp: now,
                idleDuration: timeSinceLastActivity
            });
        }
        
        this.lastActivity = now;
    }
    
    /**
     * Check idle status
     */
    checkIdleStatus() {
        if (!this.isActive) return;
        
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        
        if (timeSinceLastActivity > this.config.idleThreshold && !this.isIdle) {
            this.isIdle = true;
            this.logEvent('idle_detected', {
                timestamp: now,
                idleDuration: timeSinceLastActivity
            });
            
            if (timeSinceLastActivity > this.config.maxIdleTime) {
                this.showAlert('Extended inactivity detected! Please continue with your quiz.');
            }
        }
        
        if (this.isIdle) {
            this.totalIdleTime += 1000;
        }
    }
    
    /**
     * Send heartbeat to server
     */
    sendHeartbeat() {
        if (!this.isActive) return;
        
        this.logEvent('heartbeat', {
            timestamp: Date.now(),
            isTabVisible: this.isTabVisible,
            isIdle: this.isIdle,
            tabSwitchCount: this.tabSwitchCount,
            totalIdleTime: this.totalIdleTime
        });
        
        // Send events to server periodically
        if (this.events.length >= 10) {
            this.sendEventsToServer();
        }
    }
    
    /**
     * Log an event
     */
    logEvent(eventType, data = {}) {
        const event = {
            id: this.generateEventId(),
            attemptId: this.attemptId,
            eventType: eventType,
            timestamp: Date.now(),
            data: data
        };
        
        this.events.push(event);
        console.log('Distraction event logged:', event);
        
        // Store in localStorage as backup
        this.storeEventLocally(event);
    }
    
    /**
     * Generate unique event ID
     */
    generateEventId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Store event in localStorage
     */
    storeEventLocally(event) {
        try {
            const key = `distraction_events_${this.attemptId}`;
            const stored = localStorage.getItem(key);
            const events = stored ? JSON.parse(stored) : [];
            events.push(event);
            localStorage.setItem(key, JSON.stringify(events));
        } catch (error) {
            console.error('Failed to store event locally:', error);
        }
    }
    
    /**
     * Send events to server
     */
    async sendEventsToServer() {
        if (this.events.length === 0) return;
        
        const eventsToSend = [...this.events];
        this.events = [];
        
        try {
            const response = await fetch('/api/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    attemptId: this.attemptId,
                    events: eventsToSend
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send events to server');
            }
            
            console.log('Events sent to server successfully');
        } catch (error) {
            console.error('Failed to send events to server:', error);
            // Re-add events to queue for retry
            this.events.unshift(...eventsToSend);
        }
    }
    
    /**
     * Show distraction alert
     */
    showAlert(message) {
        const alertElement = document.getElementById('distraction-alert');
        if (alertElement) {
            alertElement.querySelector('span').textContent = message;
            alertElement.style.display = 'flex';
            
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, this.config.alertDuration);
        }
    }
    
    /**
     * Generate summary of distraction events
     */
    generateSummary() {
        const summary = {
            totalEvents: this.events.length,
            tabSwitchCount: this.tabSwitchCount,
            totalIdleTime: this.totalIdleTime,
            duration: Date.now() - this.startTime,
            eventTypes: {}
        };
        
        // Count event types
        this.events.forEach(event => {
            summary.eventTypes[event.eventType] = (summary.eventTypes[event.eventType] || 0) + 1;
        });
        
        // Calculate focus score (0-100)
        let focusScore = 100;
        
        // Deduct points for tab switches
        focusScore -= Math.min(this.tabSwitchCount * 10, 50);
        
        // Deduct points for idle time
        const idlePercentage = (this.totalIdleTime / summary.duration) * 100;
        focusScore -= Math.min(idlePercentage * 2, 30);
        
        // Deduct points for other suspicious activities
        const suspiciousEvents = ['devtools_opened', 'context_menu_blocked'];
        suspiciousEvents.forEach(eventType => {
            if (summary.eventTypes[eventType]) {
                focusScore -= summary.eventTypes[eventType] * 5;
            }
        });
        
        summary.focusScore = Math.max(focusScore, 0);
        
        return summary;
    }
    
    /**
     * Get current distraction statistics
     */
    getCurrentStats() {
        return {
            isActive: this.isActive,
            attemptId: this.attemptId,
            tabSwitchCount: this.tabSwitchCount,
            totalIdleTime: this.totalIdleTime,
            isTabVisible: this.isTabVisible,
            isIdle: this.isIdle,
            eventCount: this.events.length,
            duration: this.startTime ? Date.now() - this.startTime : 0
        };
    }
}

// Create global instance
window.distractionAnalyzer = new DistractionAnalyzer();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistractionAnalyzer;
}
