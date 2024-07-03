function download() {
  if (document.querySelector('[id = kmlc_download_button]'))
    document.querySelector('[id = kmlc_download_button]').remove();

  document
    .waitForElement(
      '[id = live-channel-stream-information] [class *= split][class *= top] button:not([class *= interact]):not([class *= Icon])'
    )
    .then((shareButton) => {
      shareButton.waitForElement('path').then((elm) => {
        shareButton = document.querySelector(
          '[id = live-channel-stream-information] [class *= split][class *= top] button:not([class *= interact]):not([class *= Icon])'
        );

        let downloadButton = shareButton.cloneNode(true);
        downloadButton.setAttribute('aria-label', 'Download');
        downloadButton.style.marginRight = '10px';
        downloadButton.setAttribute('id', 'kmlc_download_button');
        downloadButton.querySelector(
          '[data-a-target = tw-core-button-label-text]'
        ).textContent = 'Download';

        downloadButton.addEventListener('click', function () {
          let res = 'chunked';
          if (resolutions.length != 0) res = JSON.stringify(resolutions);

          res = prompt('Which resoltions between : ' + res);

          if (res == null) return;

          let file = processLines(genContent, link + '/' + res + '/');
          var enc = new TextEncoder('utf-8');

          downloadURI(
            URL.createObjectURL(new Blob([enc.encode(file)])),
            document.querySelector('[data-a-target= stream-title]').textContent + '.m3u8'
          );
        });

        shareButton.parentElement.parentElement.style.display = 'flex';
        shareButton.parentElement.parentElement.insertBefore(
          downloadButton,
          shareButton.parentElement
        );
      });
    });
}

function downloadURI(uri, name = '') {
  var link = document.createElement('a');
  link.setAttribute('download', name);
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
