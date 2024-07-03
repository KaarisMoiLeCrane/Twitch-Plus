let myVodID;
let isVod;
let wasStream = true;
let saveState;
var lastUrl = location.href;

Node.prototype.getElementsByContentText = function (text) {
  text = text.toLowerCase();
  let DOMElements = [...this.getElementsByTagName('*')];
  let obj = {
    includes: [],
    startsWith: []
  };

  DOMElements.filter((a) => a.textContent.toLowerCase().includes(text)).forEach((a) =>
    obj.includes.push(a)
  );

  DOMElements.filter((b) => b.textContent.toLowerCase().startsWith(text)).forEach((b) =>
    obj.startsWith.push(b)
  );

  return obj;
};

Node.prototype.waitForElement = function (selector) {
  return new Promise((resolve) => {
    if (this.querySelector(selector)) {
      return resolve(this.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (this.querySelector(selector)) {
        resolve(this.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(this.body, {
      childList: true,
      subtree: true
    });
  });
};

function processLines(inputString, prependString) {
  // Split the input string into an array of lines
  let lines = inputString.split('\n');

  // Iterate through each line
  for (let i = 0; i < lines.length; i++) {
    // Check if the line contains ".ts"
    if (lines[i].includes('.ts')) {
      // Prepend the specified string to the line
      lines[i] = prependString + lines[i];
    }
  }

  // Join the array of lines back into a single string
  return lines.join('\n');
}

function processLines2(inputString) {
  // Split the input string into an array of lines
  let lines = inputString.split('\n');

  // Iterate through each line
  for (let i = 0; i < lines.length; i++) {
    // Check if the line contains ".ts"
    if (lines[i].includes('-unmuted')) {
      // Prepend the specified string to the line
      lines[i] = '';
    }
  }

  // Join the array of lines back into a single string
  return lines.join('\n');
}

async function main(shouldPause = true) {
  let loc = location.pathname.split('/');

  if (
    loc[1].includes('video') &&
    (loc.length == 3 || loc.length == 4) &&
    /\d/.test(loc[2])
  ) {
    chrome.runtime.sendMessage({action: 'enableBlocking'}, function (response) {
      // if (chrome.runtime.lastError) return;
      console.log(
        `%c[Twitch +] ${response}`,
        'color: #764fb0; -webkit-text-stroke: 2px black; font-size: 42px; font-weight: bold;'
      );
    });

    myVodID = window.location.href.split('video/')[1]
      ? window.location.href.split('video/')[1].split('?')[0]
      : window.location.href.split('videos/')[1].split('?')[0];
    let vodInfo = await fetch('https://gql.twitch.tv/gql', {
      headers: {
        accept: '*/*',
        'client-id': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
      },
      body:
        '[{"variables":{"videoID":"' +
        myVodID +
        '"},"extensions":{"persistedQuery":{"sha256Hash":"07e99e4d56c5a7c67117a154777b0baf85a5ffefa393b213f4bc712ccaf85dd6"}}}]',
      method: 'POST'
    }).then((resp) => resp.json());

    let link = vodInfo[0].data.video.seekPreviewsURL.split('/storyboards/')[0];
    let fail = true;

    let resolutions = await fetch('https://gql.twitch.tv/gql', {
      headers: {
        'client-id': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
      },
      body: window.body,
      method: 'POST'
    }).then((resp) => resp.json());

    if (resolutions?.data?.videoPlaybackAccessToken == undefined) {
      resolutions = await fetch('https://gql.twitch.tv/gql', {
        headers: {
          'client-id': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
        },
        body:
          '{"query":"query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: \\"web\\", playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isLive) {    value    signature    __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: \\"web\\", playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isVod) {    value    signature    __typename  }}","variables":{"isLive":false,"login":"","isVod":true,"vodID":"' +
          myVodID +
          '","playerType":"site"}}',
        method: 'POST'
      }).then((resp) => resp.json());
    }

    console.log(resolutions);

    resolutions = JSON.parse(resolutions.data.videoPlaybackAccessToken.value).chansub
      .restricted_bitrates;

    // Load the Plyr CSS
    if (!document.querySelector('[id = kmlc_css_plyr]')) {
      const plyrCssLink = document.createElement('link');
      plyrCssLink.rel = 'stylesheet';
      plyrCssLink.href = 'https://cdn.plyr.io/3.6.8/plyr.css';
      plyrCssLink.id = 'kmlc_css_plyr';
      document.head.appendChild(plyrCssLink);
    }

    document.waitForElement('video:not([id = kmlc_video_source])').then((elm) => {
      if (shouldPause) {
        saveState = document.querySelector('div.channel-root__player').innerHTML;
        elm.pause();
        elm.remove();
      } else {
        document.querySelector('div.channel-root__player').innerHTML = saveState;
      }
    });

    console.log(document.querySelectorAll('video'));

    // Create the video element
    const video = document.createElement('video');
    video.controls = true;
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.id = 'kmlc_video_source';

    document.querySelector('[class *= persistent][class *= player]').style.display =
      'none';
    let elmParentHide = document.querySelector(
      'div[class *= channel][class *= root][class *= player]:not([class *= background])'
    );
    for (let i = 0; i < elmParentHide.children.length; i++) {
      elmParentHide.children[i].style.display = 'none';
    }
    elmParentHide.appendChild(video);

    console.log(document.querySelectorAll('video'), elmParentHide);

    // Load the HLS.js library
    let hlsScript = document.querySelector('[id = kmlc_js_hls]');
    function hlsFunction() {
      // Load the Plyr JavaScript
      let plyrScript = document.querySelector('[id = kmlc_js_plyr]');
      async function plyrFunction() {
        const defaultQuality = resolutions[Math.round(resolutions.length / 2) - 1]
          ? resolutions[Math.round(resolutions.length / 2) - 1]
          : 'chunked';
        // Create the Plyr player
        const player = new Plyr(video, {
          captions: {active: true, update: true, language: 'en'},
          controls: [
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'settings',
            'fullscreen',
            'picture-in-picture'
          ],
          settings: ['captions', 'quality', 'speed'],
          quality: {
            default: defaultQuality,
            options: resolutions,
            forced: true
          }
        });

        // HLS.js configuration
        if (Hls.isSupported()) {
          const hls = new Hls();
          let url = link + '/' + defaultQuality + '/index-dvr.m3u8';
          let urlHighlight =
            link + '/' + defaultQuality + '/highlight-' + myVodID + '.m3u8';
          console.log(url, urlHighlight);

          let content = await fetch(url, {
            method: 'GET'
          }).then((resp) => resp.text());

          isVod = true;

          if (content.includes('AccessDenied')) {
            isVod = false;
            content = await fetch(urlHighlight, {
              method: 'GET'
            }).then((resp) => resp.text());
          }

          // content = content.replaceAll("-unmuted.ts", ".ts")
          content = content.replaceAll('-unmuted.ts', '-muted.ts');
          // content = processLines2(content)
          content = processLines(content, link + '/' + defaultQuality + '/');

          console.log(video, player, hls.loadSource, hls.attachMedia, hls, content);

          var enc = new TextEncoder('utf-8');
          hls.loadSource(URL.createObjectURL(new Blob([enc.encode(content)])));
          hls.attachMedia(video);
          window.hls = hls;

          player.on('languagechange', () => {
            setTimeout(() => (hls.subtitleTrack = player.currentTrack), 50);
          });
        }

        // Expose player so it can be used from the console
        window.player = player;
      }

      plyrFunction();
    }

    hlsFunction();

    async function loadVideo(url) {
      console.log(url);
      let time = 0;
      if (window.hls) {
        time = window.player.currentTime;
        window.hls.destroy();
      }
      const hls = new Hls();
      let content = await fetch(url, {
        method: 'GET'
      }).then((resp) => resp.text());
      // content = content.replaceAll("-unmuted.ts", ".ts")
      content = content.replaceAll('-unmuted.ts', '-muted.ts');
      // content = processLines2(content)

      let m3u8File = 'index-dvr.m3u8';
      if (!isVod) m3u8File = 'highlight-' + myVodID + '.m3u8';

      content = processLines(content, url.replace(m3u8File, ''));

      var enc = new TextEncoder('utf-8');
      hls.loadSource(URL.createObjectURL(new Blob([enc.encode(content)])));
      hls.attachMedia(video);
      window.hls = hls;

      window.player.on('loadeddata', onDataLoaded);
      function onDataLoaded() {
        if (time <= window.player.duration) {
          window.player.off('loadeddata', onDataLoaded);
          window.player.currentTime = time;
        }
      }
    }

    document
      .waitForElement('[id *= plyr][id *= settings][id *= quality] > div[role=menu]')
      .then((elm) => {
        let qualityBoxes = elm.children;
        let m3u8File = '/index-dvr.m3u8';
        if (!isVod) m3u8File = '/highlight-' + myVodID + '.m3u8';

        for (let i = 0; i < qualityBoxes.length; i++) {
          qualityBoxes[i].addEventListener('click', function () {
            document
              .querySelector("[id *= 'plyr-settings-'][id *= '-home'] > div[role=menu]")
              .getElementsByContentText('Quality')
              .startsWith[1].querySelector('[class *= value]').textContent =
              this.textContent;
            loadVideo(link + '/' + this.getAttribute('value') + m3u8File);
          });
        }
      });
  } else {
    chrome.runtime.sendMessage({action: 'disableBlocking'}, function (response) {
      // if (chrome.runtime.lastError) return;
      console.log(
        `%c[Twitch +] ${response}`,
        'color: #764fb0; -webkit-text-stroke: 2px black; font-size: 42px; font-weight: bold;'
      );
    });
    if (document.querySelector('[class *= persistent][class *= player]'))
      document.querySelector('[class *= persistent][class *= player]').style.display =
        null;
    let elmParentHide = document.querySelector(
      'div[class *= channel][class *= root][class *= player]:not([class *= background])'
    );
    for (let i = 0; i < elmParentHide.children.length; i++) {
      elmParentHide.children[i].style.display = null;
    }
  }
}

main();

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;

    if (document.querySelector('[id = kmlc_video_source]')) {
      document.querySelector('[id = kmlc_video_source]').remove();
      window.player.elements.container.remove();
      window.player = null;
    }

    main(false);
  }
}).observe(document, {subtree: true, childList: true});
