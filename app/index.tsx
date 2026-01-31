import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const INJECTED_JAVASCRIPT = `(function() {
  // Fix viewport height on iOS (100vh issue)
  const setViewport = () => {
    const height = window.innerHeight;
    document.documentElement.style.setProperty('--vh', height + 'px');
    document.body.style.minHeight = height + 'px';
  };
  setViewport();
  window.addEventListener('resize', setViewport);
  window.addEventListener('orientationchange', () => setTimeout(setViewport, 100));

  // iOS-specific: prevent zoom, bounce, and improve touch
  const meta = document.querySelector('meta[name=viewport]');
  if (meta) {
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  } else {
    const m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(m);
  }

  // Remove iOS rubber-band effect on body
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.overscrollBehaviorY = 'none';
})();`;

export default function Index() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [isConnected, setIsConnected] = useState(true);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [isSplashHidden, setIsSplashHidden] = useState(false);

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS === "android") {
      const onBackPress = () => {
        if (canGoBack.current && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }
  }, []);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  // Minimum splash time (you can increase to 2000–3000ms if you want longer branding)
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Hide splash with smooth fade
  const hideSplash = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setIsSplashHidden(true));
  };

  useEffect(() => {
    if (minTimePassed && isWebViewReady) {
      hideSplash();
    }
  }, [minTimePassed, isWebViewReady]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Status bar handling – perfect for both platforms */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Splash Screen */}
      {!isSplashHidden && (
        <Animated.View
          pointerEvents="none"
          style={[styles.splashContainer, { opacity: fadeAnim }]}
        >
          <Image
            source={require("./assets/splash.jpg")}
            style={styles.splashImage}
            resizeMode="cover"
          />
        </Animated.View>
      )}

      <SafeAreaView style={styles.container}>
        {isConnected ? (
          <WebView
            ref={webViewRef}
            source={{ uri: "https://gamestar365.com" }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState={false}
            scalesPageToFit={false} // Important for iOS
            decelerationRate="normal"
            allowsBackForwardNavigationGestures // iOS swipe to go back
            overScrollMode="never" // Android equivalent
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            directionalLockEnabled
            injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
            onLoadEnd={() => setIsWebViewReady(true)}
            onNavigationStateChange={(navState) => {
              canGoBack.current = navState.canGoBack;
            }}
            // Keep everything inside the WebView (block mailto/tel/etc.)
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;
              if (url.startsWith("http://") || url.startsWith("https://")) {
                return true;
              }
              return false;
            }}
            style={{ backgroundColor: "#121212" }}
          />
        ) : (
          <View style={styles.offlineContainer}>
            <Image
              source={require("./assets/connection.jpg")}
              style={styles.offlineImage}
            />
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#121212",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
  offlineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  offlineImage: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
});
