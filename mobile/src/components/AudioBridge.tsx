import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { playerStore } from '../store/player-store';
import { mobilePlayer } from '../services/player';

const PLAYER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var player = null;
    var currentVideoId = '';
    var isUserPaused = false;
    var isAdMuted = false;
    var monitorInterval = null;

    function post(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }

    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    function onYouTubeIframeAPIReady() {
      post('ready', {});
      if (currentVideoId) {
        loadAndPlay(currentVideoId);
      }
    }

    function loadAndPlay(id) {
      currentVideoId = id;
      isUserPaused = false;
      if (!window.YT || !window.YT.Player) return;

      if (!player) {
        player = new YT.Player('player', {
          width: '100%',
          height: '100%',
          videoId: id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: 'https://www.youtube.com',
            widget_referrer: 'https://www.youtube.com'
          },
          events: {
            onReady: function(e) {
              if (!isUserPaused) {
                e.target.playVideo();
              }
              startLoop();
            },
            onStateChange: function(e) {
              // 1: playing, 2: paused, 0: ended
              if (e.data === 1 && isUserPaused) {
                // Kullanıcı durdurmuşsa ama video oynamaya çalışıyorsa kesin durdur
                forcePauseVideo();
                return;
              }
              post('state', { state: e.data });
              if (e.data === 0) {
                post('ended', {});
              }
            },
            onError: function(e) {
              post('error', { code: e.data });
            }
          }
        });
      } else {
        player.loadVideoById({ videoId: id, startSeconds: 0 });
        if (!isUserPaused) {
          player.playVideo();
        }
        startLoop();
      }
    }

    function forcePauseVideo() {
      isUserPaused = true;
      var v = document.querySelector('video');
      if (v) {
        try { v.pause(); v.muted = true; } catch(e) {}
      }
      if (player && typeof player.pauseVideo === 'function') {
        try { player.pauseVideo(); } catch(e) {}
      }
      post('state', { state: 2 });
    }

    function forceResumeVideo() {
      isUserPaused = false;
      var v = document.querySelector('video');
      if (v) {
        try { v.muted = false; v.play(); } catch(e) {}
      }
      if (player && typeof player.playVideo === 'function') {
        try { player.playVideo(); } catch(e) {}
      }
      post('state', { state: 1 });
    }

    function startLoop() {
      if (monitorInterval) clearInterval(monitorInterval);
      monitorInterval = setInterval(function() {
        var v = document.querySelector('video');

        // --- AKILLI REKLAM KATİLİ (AD KILLER) ---
        var isAd = false;
        if (player && typeof player.getAdState === 'function') {
          isAd = (player.getAdState() === 1);
        }
        var adBox = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
        if (adBox) isAd = true;

        if (isAd && v) {
          // Reklam anında sesi kapat, 16x hıza al ve sonuna atla
          v.muted = true;
          v.playbackRate = 16.0;
          if (v.duration && !isNaN(v.duration) && v.duration > 0) {
            v.currentTime = v.duration;
          }
          var skipBtns = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
          for (var i = 0; i < skipBtns.length; i++) {
            try { skipBtns[i].click(); } catch(e) {}
          }
          isAdMuted = true;
        } else if (isAdMuted && v) {
          // Reklam bitti, şarkı başladı: normal hıza dön ve sesi aç
          v.playbackRate = 1.0;
          if (!isUserPaused) {
            v.muted = false;
          }
          isAdMuted = false;
        }

        // --- CANLI İLERLEME VE SÜRE TAKİBİ ---
        if (!isAd && player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
          var cur = player.getCurrentTime() || (v ? v.currentTime : 0) || 0;
          var dur = player.getDuration() || (v ? v.duration : 0) || 0;
          post('progress', { currentTime: cur, duration: dur });
        }
      }, 300);
    }

    window.playSong = function(id) {
      loadAndPlay(id);
    };

    window.pauseSong = function() {
      forcePauseVideo();
    };

    window.resumeSong = function() {
      forceResumeVideo();
    };

    window.seekSong = function(sec) {
      if (player && typeof player.seekTo === 'function') {
        try { player.seekTo(sec, true); } catch(e) {}
      }
      var v = document.querySelector('video');
      if (v) {
        try { v.currentTime = sec; } catch(e) {}
      }
    };

    window.setSongVolume = function(vol) {
      if (player && typeof player.setVolume === 'function') {
        try { player.setVolume(vol); } catch(e) {}
      }
      var v = document.querySelector('video');
      if (v) {
        try { v.volume = Math.max(0, Math.min(1, vol / 100)); } catch(e) {}
      }
    };
  </script>
</body>
</html>
`;

export const AudioBridge: React.FC = () => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    mobilePlayer.registerBridge({
      play: (id: string) => {
        webViewRef.current?.injectJavaScript(`window.playSong && window.playSong('${id}'); true;`);
      },
      pause: () => {
        webViewRef.current?.injectJavaScript(`window.pauseSong && window.pauseSong(); true;`);
      },
      resume: () => {
        webViewRef.current?.injectJavaScript(`window.resumeSong && window.resumeSong(); true;`);
      },
      seek: (seconds: number) => {
        webViewRef.current?.injectJavaScript(`window.seekSong && window.seekSong(${seconds}); true;`);
      },
      setVolume: (vol: number) => {
        webViewRef.current?.injectJavaScript(`window.setSongVolume && window.setSongVolume(${vol}); true;`);
      }
    });

    return () => {
      mobilePlayer.unregisterBridge();
    };
  }, []);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (!data || !data.type) return;

      switch (data.type) {
        case 'state':
          if (data.state === 1) {
            playerStore.setPlaying(true);
          } else if (data.state === 2) {
            playerStore.setPlaying(false);
          }
          break;

        case 'progress':
          if (typeof data.currentTime === 'number') {
            playerStore.setProgress(data.currentTime, data.duration || 0);
          }
          break;

        case 'ended':
          mobilePlayer.playNext();
          break;

        case 'error':
          console.warn('[AudioBridge] Player error code:', data.code);
          // 2: Geçersiz parametre, 100: Bulunamadı, 101/150: Yerleştirmeye kapalı
          if (data.code === 101 || data.code === 150 || data.code === 100 || data.code === 2) {
            mobilePlayer.playNext();
          }
          break;

        case 'ready':
          console.log('[AudioBridge] Oynatma motoru hazır');
          break;
      }
    } catch (e) {
      console.warn('[AudioBridge] Message parse error:', e);
    }
  };

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: PLAYER_HTML,
          baseUrl: 'https://www.youtube.com'
        }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        automaticallyAdjustContentInsets={false}
        bounces={false}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        style={styles.webView}
        onMessage={handleMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 240,
    height: 240,
    opacity: 0.01,
    zIndex: -1
  },
  webView: {
    width: 240,
    height: 240,
    backgroundColor: '#000'
  }
});
