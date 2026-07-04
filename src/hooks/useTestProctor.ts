import { useEffect, useRef, useCallback, useState } from 'react';

interface ProctorConfig {
  enableFullscreen?: boolean;
  enableTabSwitchDetection?: boolean;
  enableCopyCutPaste?: boolean;
  enableRightClick?: boolean;
  enableDevTools?: boolean;
  enableScreenshot?: boolean;
  enableMobileProctoring?: boolean;
  maxViolations?: number;
  onViolation?: (type: string, count: number) => void;
  onMaxViolationsReached?: () => void;
}

interface ProctorState {
  isFullscreen: boolean;
  violationCount: number;
  violations: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }>;
}

export const useTestProctor = (config: ProctorConfig = {}) => {
  const {
    enableFullscreen = true,
    enableTabSwitchDetection = true,
    enableCopyCutPaste = false,
    enableRightClick = false,
    enableDevTools = true,
    enableScreenshot = false,
    enableMobileProctoring = false,
    maxViolations = 3,
    onViolation,
    onMaxViolationsReached
  } = config;

  const [proctorState, setProctorState] = useState<ProctorState>({
    isFullscreen: false,
    violationCount: 0,
    violations: []
  });

  const violationCountRef = useRef(0);
  const violationsRef = useRef<ProctorState['violations']>([]);

  const addViolation = useCallback((type: string, description: string) => {
    const violation = {
      type,
      timestamp: new Date(),
      description
    };

    violationCountRef.current += 1;
    violationsRef.current.push(violation);

    setProctorState(prev => ({
      ...prev,
      violationCount: violationCountRef.current,
      violations: [...violationsRef.current]
    }));

    console.warn(`🚨 Test Violation Detected: ${type} - ${description}`);
    onViolation?.(type, violationCountRef.current);

    if (violationCountRef.current >= maxViolations) {
      console.error(`🚫 Maximum violations (${maxViolations}) reached!`);
      onMaxViolationsReached?.();
    }
  }, [maxViolations, onViolation, onMaxViolationsReached]);

  // Fullscreen Management
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      // Don't add violation for failing to enter - only for exiting after entering
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  // Track if fullscreen was ever entered to avoid initial violation
  const hasEnteredFullscreen = useRef(false);
  const testStartTime = useRef<number>(0);
  const GRACE_PERIOD_MS = 10000; // 10 seconds grace period for initial setup

  // Fullscreen Event Handlers
  useEffect(() => {
    if (!enableFullscreen) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );

      console.log('Fullscreen state changed:', isCurrentlyFullscreen);
      setProctorState(prev => ({ ...prev, isFullscreen: isCurrentlyFullscreen }));

      if (isCurrentlyFullscreen) {
        hasEnteredFullscreen.current = true;
        console.log('User entered fullscreen mode');
      } else if (hasEnteredFullscreen.current && testStarted.current) {
        // Add grace period check to avoid violations during initial setup
        const now = Date.now();
        const timeSinceTestStart = now - testStartTime.current;

        if (timeSinceTestStart > GRACE_PERIOD_MS) {
          console.log('User exited fullscreen mode - adding violation');
          addViolation('FULLSCREEN_EXIT', 'User exited fullscreen mode during test');
        } else {
          console.log('Fullscreen exit detected but within grace period, no violation added');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [enableFullscreen, addViolation]);

  // Track if test has actually started to avoid initial violations
  const testStarted = useRef(false);
  const startTestTracking = useCallback(() => {
    testStarted.current = true;
    testStartTime.current = Date.now();
    console.log('Test proctoring started with grace period for initial setup');
  }, []);

  // Tab Switch Detection
  useEffect(() => {
    if (!enableTabSwitchDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden && testStarted.current) {
        // Add grace period check to avoid violations during initial setup
        const now = Date.now();
        const timeSinceTestStart = now - testStartTime.current;

        if (timeSinceTestStart > GRACE_PERIOD_MS) {
          console.log('Tab switch detected');
          addViolation('TAB_SWITCH', 'User switched to another tab or window');
        } else {
          console.log('Tab switch detected but within grace period, no violation added');
        }
      }
    };

    const handleBlur = () => {
      if (testStarted.current) {
        // Add grace period check to avoid violations during initial setup
        const now = Date.now();
        const timeSinceTestStart = now - testStartTime.current;

        if (timeSinceTestStart > GRACE_PERIOD_MS) {
          console.log('Window blur detected');
          addViolation('WINDOW_BLUR', 'Browser window lost focus');
        } else {
          console.log('Window blur detected but within grace period, no violation added');
        }
      }
    };

    const handleFocus = () => {
      console.log('User returned to test window');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enableTabSwitchDetection, addViolation]);

  // Disable Copy, Cut, Paste
  useEffect(() => {
    if (enableCopyCutPaste) return; // Fixed: should return if enabled, not disabled

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!testStarted.current) return;

      // Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
      if (e.ctrlKey && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        console.log(`Copy/paste attempt detected: ${e.key}`);
        addViolation('COPY_PASTE_ATTEMPT', `Attempted ${e.key.toUpperCase()} operation`);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!testStarted.current) return;
      e.preventDefault();
      console.log('Right click attempt detected');
      addViolation('RIGHT_CLICK', 'Attempted to access context menu');
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!testStarted.current) return;
      e.preventDefault();
      console.log('Copy attempt detected');
      addViolation('COPY_ATTEMPT', 'Attempted to copy content');
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!testStarted.current) return;
      e.preventDefault();
      console.log('Paste attempt detected');
      addViolation('PASTE_ATTEMPT', 'Attempted to paste content');
    };

    document.addEventListener('keydown', handleKeyDown);
    if (!enableRightClick) { // Fixed: should disable right click when enableRightClick is false
      document.addEventListener('contextmenu', handleContextMenu);
    }
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enableCopyCutPaste, enableRightClick, addViolation]);

  // Disable Developer Tools
  useEffect(() => {
    if (!enableDevTools) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!testStarted.current) return;

      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        console.log('Developer tools attempt detected');
        addViolation('DEV_TOOLS_ATTEMPT', 'Attempted to open developer tools');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableDevTools, addViolation]);

  // Screenshot Detection (limited effectiveness)
  useEffect(() => {
    if (!enableScreenshot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!testStarted.current) return;

      // Detect common screenshot shortcuts
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) || // Mac screenshots
        (e.altKey && e.key === 'PrintScreen') // Windows Alt+PrintScreen
      ) {
        e.preventDefault();
        console.log('Screenshot attempt detected');
        addViolation('SCREENSHOT_ATTEMPT', 'Attempted to take screenshot');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableScreenshot, addViolation]);

  // Mobile Proctoring System
  const lastActiveTime = useRef(Date.now());
  const blurStartTime = useRef<number>(0);
  const originalWindowSize = useRef<{ width: number; height: number } | null>(null);
  const screenCheckerInterval = useRef<number | null>(null);

  useEffect(() => {
    if (!enableMobileProctoring) return;

    const isMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      return mobileRegex.test(userAgent.toLowerCase()) || 'ontouchstart' in window;
    };

    const isAndroid = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android/i.test(userAgent.toLowerCase());
    };

    if (!isMobile()) {
      console.log('Mobile proctoring enabled but not on mobile device');
      return;
    }

    // Store initial window dimensions
    originalWindowSize.current = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    console.log(`Initial screen size recorded: ${originalWindowSize.current.width}x${originalWindowSize.current.height}`);

    // Function to detect split screen, one-handed mode, or PIP
    const detectScreenModeChange = () => {
      if (!testStarted.current || !originalWindowSize.current) return;

      // Get current screen dimensions
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // Calculate how much the dimensions changed as percentages
      const widthRatio = currentWidth / originalWindowSize.current.width;
      const heightRatio = currentHeight / originalWindowSize.current.height;

      console.log(`Screen dimensions check - Width ratio: ${widthRatio.toFixed(2)}, Height ratio: ${heightRatio.toFixed(2)}`);

      // Thresholds for detecting significant changes
      const SPLIT_SCREEN_THRESHOLD = 0.8; // 20% change in either dimension
      const SMALL_MODE_THRESHOLD = 0.85; // 15% change for one-handed mode

      // Detect horizontal split screen (common on tablets/larger phones)
      if (widthRatio < SPLIT_SCREEN_THRESHOLD && Math.abs(heightRatio - 1) < 0.1) {
        console.log('📱 Horizontal split screen detected');
        addViolation('ANDROID_SPLIT_SCREEN', 'Split screen mode detected - horizontal');
        return true;
      }

      // Detect vertical split screen
      if (heightRatio < SPLIT_SCREEN_THRESHOLD && Math.abs(widthRatio - 1) < 0.1) {
        console.log('📱 Vertical split screen detected');
        addViolation('ANDROID_SPLIT_SCREEN', 'Split screen mode detected - vertical');
        return true;
      }

      // Detect one-handed mode (usually smaller in both dimensions)
      if (widthRatio < SMALL_MODE_THRESHOLD && heightRatio < SMALL_MODE_THRESHOLD) {
        console.log('📱 One-handed mode or minimized window detected');
        addViolation('ANDROID_ONE_HAND_MODE', 'One-handed mode or minimized window detected');
        return true;
      }

      // Detect PIP (Picture in Picture) - typically much smaller
      if (widthRatio < 0.5 && heightRatio < 0.5) {
        console.log('📱 Possible PIP mode detected');
        addViolation('ANDROID_PIP_MODE', 'Picture-in-Picture or floating window detected');
        return true;
      }

      return false;
    };

    // Start screen mode detection interval
    screenCheckerInterval.current = window.setInterval(detectScreenModeChange, 2000); // Check every 2 seconds

    console.log('🔒 Mobile proctoring system activated');
    const minimumBlurDuration = 2000; // 2 seconds minimum to count as violation
    const shortBlurThreshold = 500; // Under 500ms is likely accidental

    // Track app state changes
    const handleVisibilityChange = () => {
      if (!testStarted.current) return;

      const now = Date.now();
      const timeSinceTestStart = now - testStartTime.current;

      if (timeSinceTestStart <= GRACE_PERIOD_MS) return;

      if (document.hidden) {
        // App went to background or user switched apps
        blurStartTime.current = now;
        console.log('📱 Mobile app went to background or user switched apps');
      } else {
        // App came back to foreground
        if (blurStartTime.current > 0) {
          const blurDuration = now - blurStartTime.current;
          console.log(`📱 Mobile app returned to foreground after ${blurDuration}ms`);

          if (blurDuration > minimumBlurDuration) {
            addViolation('MOBILE_APP_SWITCH', `Switched away from test app for ${Math.round(blurDuration / 1000)} seconds`);
          } else if (blurDuration > shortBlurThreshold) {
            console.log('⚠️ Short app switch detected but under threshold');
          }

          blurStartTime.current = 0;
        }
        lastActiveTime.current = now;
      }
    };

    // Enhanced focus/blur detection for mobile
    const handleWindowBlur = () => {
      if (!testStarted.current) return;

      const now = Date.now();
      const timeSinceTestStart = now - testStartTime.current;

      if (timeSinceTestStart <= GRACE_PERIOD_MS) return;

      blurStartTime.current = now;
      console.log('📱 Mobile browser window lost focus');
    };

    const handleWindowFocus = () => {
      if (!testStarted.current || blurStartTime.current === 0) return;

      const now = Date.now();
      const blurDuration = now - blurStartTime.current;

      console.log(`📱 Mobile browser window regained focus after ${blurDuration}ms`);

      if (blurDuration > minimumBlurDuration) {
        addViolation('MOBILE_FOCUS_LOSS', `Lost focus for ${Math.round(blurDuration / 1000)} seconds`);
      }

      blurStartTime.current = 0;
      lastActiveTime.current = now;
    };

    // Detect orientation changes (potential screen recording or split screen)
    const handleOrientationChange = () => {
      if (!testStarted.current) return;

      const now = Date.now();
      const timeSinceTestStart = now - testStartTime.current;

      if (timeSinceTestStart <= GRACE_PERIOD_MS) return;

      console.log('📱 Device orientation changed - potential screen recording or split screen');
      addViolation('MOBILE_ORIENTATION_CHANGE', 'Device orientation changed during test');

      // Update original window size reference after orientation change
      // This prevents false positives after legitimate orientation changes
      setTimeout(() => {
        if (originalWindowSize.current) {
          originalWindowSize.current = {
            width: window.innerWidth,
            height: window.innerHeight
          };
          console.log(`Updated screen size after orientation: ${originalWindowSize.current.width}x${originalWindowSize.current.height}`);
        }
      }, 1000); // Small delay to let resize complete
    };

    // Detect potential screen recording through screen recording API if available
    const detectScreenRecording = async () => {
      try {
        if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
          // This is a basic detection - modern browsers restrict this
          const checkRecording = () => {
            if (!testStarted.current) return;

            // Check if screen is being captured (limited browser support)
            if ('screen' in window && (window.screen as any).isExtended) {
              console.log('📱 Potential screen sharing detected');
              addViolation('MOBILE_SCREEN_CAPTURE', 'Potential screen recording or sharing detected');
            }
          };

          // Check periodically
          const recordingCheckInterval = setInterval(checkRecording, 10000); // Every 10 seconds

          return () => clearInterval(recordingCheckInterval);
        }
      } catch (error) {
        console.log('Screen recording detection not available:', error);
      }
      return () => { };
    };

    // Track touch interactions to detect unusual patterns
    let touchCount = 0;
    let rapidTouchStart = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (!testStarted.current) return;

      const now = Date.now();

      // Detect rapid multi-touch (potential screenshot gesture)
      if (e.touches.length > 1) {
        if (now - rapidTouchStart < 1000) {
          touchCount++;
          if (touchCount > 3) {
            console.log('📱 Rapid multi-touch detected - potential screenshot attempt');
            addViolation('MOBILE_MULTI_TOUCH', 'Rapid multi-touch gestures detected');
            touchCount = 0;
          }
        } else {
          touchCount = 1;
        }
        rapidTouchStart = now;
      }
    };

    // Context menu detection (long press)
    const handleContextMenu = (e: Event) => {
      if (!testStarted.current) return;

      e.preventDefault();
      console.log('📱 Mobile context menu attempt detected');
      addViolation('MOBILE_CONTEXT_MENU', 'Attempted to access context menu on mobile');
    };

    // Clipboard monitoring for mobile copy/paste
    const handleMobileClipboard = async () => {
      if (!testStarted.current) return;

      try {
        if ('clipboard' in navigator) {
          // Monitor clipboard changes (limited by browser security)
          const checkClipboard = async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text && text.length > 10) { // Ignore very short clipboard content
                console.log('📱 Clipboard content detected during test');
                addViolation('MOBILE_CLIPBOARD', 'Clipboard activity detected during test');
              }
            } catch (error) {
              // Silently fail - clipboard access is restricted
            }
          };

          const clipboardInterval = setInterval(checkClipboard, 5000); // Every 5 seconds
          return () => clearInterval(clipboardInterval);
        }
      } catch (error) {
        console.log('Mobile clipboard monitoring not available:', error);
      }
      return () => { };
    };

    // Set up all mobile event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', detectScreenModeChange); // Detect screen size changes
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu);

    // For Android specifically, detect split screen attempts
    if (isAndroid()) {
      console.log('📱 Enhanced Android-specific proctoring activated');

      // Try to prevent split screen on Android using CSS
      const style = document.createElement('style');
      style.id = 'mobile-proctor-styles';
      style.textContent = `
      /* Mobile Test Security Styles - Allow Scrolling */
      html, body {
        width: 100% !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
      }
      /* Allow content to scroll properly */
      #root {
        min-height: 100vh !important;
        width: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      /* Disable text selection in test content */
      .test-content * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      /* Allow input fields and buttons to be selectable/clickable */
      input, textarea, button, select {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
      document.head.appendChild(style);

      // Prevent Android back button
      const preventBackButton = (event: PopStateEvent) => {
        if (!testStarted.current) return;

        // Add a new history entry to prevent going back
        history.pushState(null, '', window.location.pathname);

        console.log('📱 Android back button prevented');
        addViolation('ANDROID_BACK_BUTTON', 'Attempted to use back button during test');

        // Show alert to user
        alert('Navigation is blocked during the test. Please use the test interface navigation.');
      };

      // Set up back button prevention
      window.addEventListener('popstate', preventBackButton);
      // Add initial history entry to prevent back navigation
      history.pushState(null, '', window.location.pathname);

      // Lock orientation to portrait if possible (helps prevent split screen)
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('portrait')
            .then(() => console.log('📱 Locked to portrait orientation'))
            .catch(err => console.log('Failed to lock orientation:', err));
        }
      } catch (error) {
        console.log('Orientation locking not supported:', error);
      }
    }

    // Initialize additional detection systems
    const cleanupScreenRecording = detectScreenRecording();
    const cleanupClipboard = handleMobileClipboard();

    // Periodic activity check
    const activityCheck = setInterval(() => {
      if (!testStarted.current) return;

      const now = Date.now();
      const inactiveTime = now - lastActiveTime.current;

      // If inactive for more than 2 minutes, it might indicate cheating
      if (inactiveTime > 120000) {
        console.log('📱 Extended inactivity detected');
        addViolation('MOBILE_INACTIVITY', `No activity for ${Math.round(inactiveTime / 60000)} minutes`);
        lastActiveTime.current = now;
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', detectScreenModeChange);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('contextmenu', handleContextMenu);

      // Remove mobile proctor styles
      const styleElement = document.getElementById('mobile-proctor-styles');
      if (styleElement) {
        styleElement.remove();
      }

      // Clear all intervals
      clearInterval(activityCheck);
      if (screenCheckerInterval.current !== null) {
        clearInterval(screenCheckerInterval.current);
        screenCheckerInterval.current = null;
      }

      cleanupScreenRecording.then(cleanup => cleanup()).catch(() => { });
      cleanupClipboard.then(cleanup => cleanup()).catch(() => { });
    };
  }, [enableMobileProctoring, addViolation, enterFullscreen]);

  // Stop proctoring tracking
  const stopProctoring = useCallback(() => {
    testStarted.current = false;
    hasEnteredFullscreen.current = false;
    console.log('Proctoring stopped - all event listeners will ignore events');
  }, []);

  // Return proctor controls and state
  return {
    proctorState,
    enterFullscreen,
    exitFullscreen,
    startTestTracking,
    stopProctoring,
    resetViolations: useCallback(() => {
      violationCountRef.current = 0;
      violationsRef.current = [];
      setProctorState(prev => ({
        ...prev,
        violationCount: 0,
        violations: []
      }));
    }, [])
  };
};
