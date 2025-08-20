class NotificationService {
  constructor() {
    this.permission = "default";
    this.isSupported = "Notification" in window;
    this.notificationIcons = {
      default: "/favicon.ico",
      message: "/notify.png", // Ensure we have a message icon
    };
    this.socket = null;
    this.currentRoomId = null;
    this.navigateToRoom = null; // Will be set by the Chat component

    // Bind methods to maintain correct 'this' context
    this.showNotification = this.showNotification.bind(this);
    this.showMessageNotification = this.showMessageNotification.bind(this);

    // Detect WebView
    this.isInWebView =
      /wv/.test(navigator.userAgent) || window.ReactNativeWebView;
  }

  // Initialize with socket connection
  init(socket) {
    this.socket = socket;
    console.log("NotificationService initialized with socket");
    return this.initialize();
  }

  // Cleanup method for component unmount
  cleanup() {
    console.log("NotificationService cleanup");
    if (this.socket) {
      // Remove any socket listeners if needed
      this.socket = null;
    }
  }

  async initialize() {
    console.log("🔔 NotificationService: Initializing...");
    if (this.isInWebView) {
      console.log(
        "📱 NotificationService: WebView detected - initializing OneSignal..."
      );
      await this.initializeOneSignal();
      return;
    }

    if (!this.isSupported) {
      // window alert
      console.warn("NotificationService: Browser does not support desktop notifications");
      alert(
        "⚠️ NotificationService: Browser does not support desktop notifications"
      );
      return;
    }

    console.log(
      "🌐 NotificationService: Browser environment - using native Notification API"
    );

    // Set current permission
    this.permission = Notification.permission;
    console.log(
      "🔐 NotificationService: Current notification permission:",
      this.permission
    );

    // Request permission if not already granted or denied
    if (this.permission === "default") {
      try {
        console.log(
          "🔐 NotificationService: Requesting notification permission..."
        );
        this.permission = await Notification.requestPermission();
        console.log(
          "✅ NotificationService: Notification permission granted:",
          this.permission
        );
      } catch (error) {
        console.error(
          "❌ NotificationService: Error requesting notification permission:",
          error
        );
        this.permission = "denied";
      }
    }
  }

  async initializeOneSignal() {
    console.log("🚀 NotificationService: Initializing OneSignal SDK...");
    return new Promise((resolve) => {
      // OneSignal v16 is already initialized in index.html
      // Just wait for it to be ready
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function () {
          console.log(
            "✅ NotificationService: OneSignal SDK v16 ready and connected"
          );
          resolve();
        });
      } else {
        // Fallback if OneSignal is already loaded
        console.log("✅ NotificationService: OneSignal already available");
        resolve();
      }
    });
  }

  // Show a notification
  async showNotification({
    title,
    body,
    icon,
    data,
    tag,
    type = "default",
    onClick,
  }) {
    console.log("🔔 NotificationService: showNotification called", {
      title,
      body: body?.substring(0, 50) + "...",
      type,
      timestamp: new Date().toISOString(),
    });

    if (this.isInWebView) {
      console.log(
        "📱 NotificationService: WebView detected - sending to native app"
      );
      // For WebView, send message to native app
      if (window.ReactNativeWebView) {
        console.log(
          "📤 NotificationService: Posting message to React Native WebView"
        );
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "notification",
            title,
            message: body,
            data: data || {},
            icon:
              icon ||
              this.notificationIcons[type] ||
              this.notificationIcons.default,
          })
        );
        console.log("✅ NotificationService: Message sent to native app");
      } else {
        console.warn(
          "⚠️ NotificationService: WebView detected but ReactNativeWebView not available"
        );
      }
      return null;
    }

    console.log("🌐 NotificationService: Using browser Notification API");

    // Check if notifications are supported
    if (!this.isSupported) {
      console.warn(
        "❌ NotificationService: Browser does not support desktop notifications"
      );
      return null;
    }

    // Always show notifications - removed permission check for always showing
    // Check and request permission if needed
    if (this.permission !== "granted") {
      console.log(
        "🔐 NotificationService: Requesting notification permission..."
      );
      try {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        console.log("✅ NotificationService: Permission result:", permission);
      } catch (error) {
        console.error(
          "❌ NotificationService: Error requesting notification permission:",
          error
        );
      }
    }

    try {
      // Create notification options
      const options = {
        body,
        icon:
          icon ||
          this.notificationIcons[type] ||
          this.notificationIcons.default,
        data: data || {},
        tag: tag || `notification-${type}-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
      };

      console.log("🔔 NotificationService: Creating browser notification", {
        title,
        type,
        tag: options.tag,
        timestamp: new Date().toISOString(),
      });

      // Create the notification
      const notification = new Notification(title, options);
      console.log(
        "✅ NotificationService: Browser notification created successfully"
      );
      console.log(
        "📊 NotificationService: Notification method - BROWSER NATIVE API"
      );
      console.log(
        "🎯 NotificationService: Notification will appear as desktop notification"
      );

      // Handle notification click
      notification.onclick = (event) => {
        console.log("🖱️ NotificationService: Browser notification clicked");
        if (onClick && typeof onClick === "function") {
          try {
            console.log("🎯 NotificationService: Executing click handler");
            onClick(notification);
          } catch (error) {
            console.error(
              "❌ NotificationService: Error in notification click handler:",
              error
            );
          }
        }

        // Close the notification
        try {
          notification.close();
          console.log(
            "✅ NotificationService: Notification closed after click"
          );
        } catch (error) {
          console.error(
            "❌ NotificationService: Error closing notification:",
            error
          );
        }

        // Focus the window
        try {
          window.focus();
          console.log("🎯 NotificationService: Window focused");
        } catch (error) {
          console.error(
            "❌ NotificationService: Error focusing window:",
            error
          );
        }
      };

      // Auto-close the notification after 10 seconds
      setTimeout(() => {
        try {
          if (notification && typeof notification.close === "function") {
            notification.close();
            console.log("Notification closed after timeout");
          }
        } catch (error) {
          console.error("Error in notification timeout handler:", error);
        }
      }, 10000);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  // This is needed for compatibility with the Chat component
  handleNotification(notification) {
    console.log("Handling notification:", notification);
    if (!notification) return;

    // Handle different types of notifications
    const { title, message, type = "default", data = {} } = notification;

    return this.showNotification({
      title: title || "New Notification",
      body: message || "You have a new notification",
      icon: this.notificationIcons[type] || this.notificationIcons.default,
      type,
      data,
    });
  }

  // Set the current room ID to prevent notifications for the active room
  setCurrentRoom(roomId) {
    this.currentRoomId = roomId;
    console.log("Current room set to:", roomId);
  }

  // This is needed for chat message notifications
  showMessageNotification(message, senderName, roomName) {
    console.log("💬 NotificationService: showMessageNotification called", {
      senderName,
      roomName,
      roomId: message?.roomId,
      messageId: message?._id,
      timestamp: new Date().toISOString(),
    });

    // Validate input
    if (!message) {
      console.error(
        "❌ NotificationService: No message provided to showMessageNotification"
      );
      return null;
    }
    if (this.currentUserId && message.senderId === this.currentUserId) {
      console.log("🙅 Skipping self-sent message");
      return;
    }

    // if (this.currentRoomId === message.roomId) {
    //   console.log('📭 Skipping notification for active room');
    //   return;
    // }

    // Always show notifications - removed current room check
    console.log(
      "📋 NotificationService: Processing message notification for display"
    );

    // Professional notification format: Group Name > Sender: Content
    const title = roomName || "Chat Message";
    const body = `${senderName || "Someone"}: ${
      message.content || "New message"
    }`;

    console.log("🔔 NotificationService: Creating message notification", {
      title,
      body: body.substring(0, 50) + "...",
      roomId: message.roomId,
      method: this.isInWebView ? "WebView/OneSignal" : "Browser Native",
    });
    const type = "message";
    return this.showNotification({
      title,
      body,
      type,
      icon: this.notificationIcons[type] || this.notificationIcons.default,
      tag: `message-${message.roomId}-${message._id || Date.now()}`, // Ensure unique tag for each message
      data: {
        roomId: message.roomId,
        messageId: message._id,
        senderId: message.senderId,
        timestamp: Date.now(),
      },
      onClick: (notification) => {
        console.log("Message notification clicked, roomId:", message.roomId);
        // Focus the chat window and scroll to the message
        if (this.navigateToRoom && message.roomId) {
          console.log("Calling navigateToRoom with roomId:", message.roomId);
          this.navigateToRoom(message.roomId);
        }
        notification.close();
      },
    });
  }
}

// Export a singleton instance
const notificationService = new NotificationService();
export default notificationService;
