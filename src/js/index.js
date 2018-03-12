import 'raf-polyfill';
import $ from 'jquery';

import promUserMedia from './get-user-media';
import Manip from './manip';

window._$ = $; // for testing...

let DELAY = 1000;
let NUM_CANVASES = 1;
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 375;

let CUR_WIDTH = DEFAULT_WIDTH;
let CUR_HEIGHT = DEFAULT_HEIGHT;

const _create = tag => document.createElement(tag);
const _sizeElt = elt =>
  Object.assign(elt, { width: CUR_WIDTH, height: CUR_HEIGHT });
const _makeCanvas = () =>
  Object.assign(_sizeElt(_create('canvas')), { className: 'canvas' });

// ## Canvas

const CLS_NORMAL = 'normal';
const CLS_SEPARATE = 'separate';
const CLS_FULLSCREEN = 'fullscreen';

const CLS_NAMES = [CLS_NORMAL, CLS_SEPARATE, CLS_FULLSCREEN];

const Layers = {
  video: _sizeElt(document.getElementById('video')),
  canvases: [],
  ctxs: [],
  transforms: [],
  curClsName: CLS_NORMAL,
  show: clsName => {
    if (CLS_NAMES.indexOf(clsName) === -1) {
      throw new Error(`Unknown class name: ${clsName}`);
    }
    Layers.curClsName = clsName;

    CLS_NAMES.forEach(cls => document.body.classList.remove(cls));
    if (clsName) {
      document.body.classList.add(clsName);
    }

    if (clsName === CLS_FULLSCREEN) {
      let width = window.innerWidth;
      let video = Layers.video;
      let height = video.videoHeight / video.videoWidth * width;

      CUR_WIDTH = width;
      CUR_HEIGHT = height;
    } else {
      CUR_WIDTH = DEFAULT_WIDTH;
      CUR_HEIGHT = DEFAULT_HEIGHT;
    }

    Layers._resizeElts();
  },
  _resizeElts: () => {
    [[Layers.video], Layers.canvases].forEach(elts =>
      elts.forEach(elt => {
        elt.setAttribute('width', CUR_WIDTH);
        elt.setAttribute('height', CUR_HEIGHT);
        elt.style.width = `${CUR_WIDTH}px`;
        elt.style.height = `${CUR_HEIGHT}px`;
      })
    );
  },
  showNext: () => {
    let curIndex = CLS_NAMES.indexOf(Layers.curClsName);
    let nextClsName = CLS_NAMES[curIndex + 1] || CLS_NAMES[0];
    Layers.show(nextClsName);
  },
  _nextId: 0,
  _getNextId: () => {
    Layers._nextId++;
    return `canvas-${Layers._nextId}`;
  },
  _update: () => {
    let self = Layers;
    if (self.canvases.length < NUM_CANVASES) {
      while (self.canvases.length < NUM_CANVASES) {
        let c = _makeCanvas();
        c.id = self._getNextId();
        document.getElementById('display').appendChild(c);
        self.canvases.push(c);
        let len = self.canvases.length;
        let opacity = Math.pow(0.5, len);
        c.style.opacity = opacity;
        self.ctxs.push(c.getContext('2d'));
      }
    } else if (self.canvases.length > NUM_CANVASES) {
      while (self.canvases.length > NUM_CANVASES) {
        let c = self.canvases.pop();
        let node = document.getElementById(c.id);
        node.parentNode.removeChild(node);
        self.ctxs.pop();
      }
    }
  }
};

// var v = document.getElementById('video');
// var w = document.body.offsetWidth
// var h = (v.videoHeight / v.videoWidth) * w;
// v.setAttribute('width', w)
// v.setAttribute('height', h)

promUserMedia({ video: true })
  .then(stream => {
    if (navigator.mozGetUserMedia) {
      Layers.video.mozSrcObject = stream;
    } else {
      var vu = window.URL || window.webkitURL;
      try {
        Layers.video.src = vu.createObjectURL(stream);
      } catch (e) {
        console.error('video.src = createObjectURL error', e);
        console.log('try `video.srcObject = stream` instead');
        Layers.video.srcObject = stream;
      }

      Layers.video.play();
    }

    (function _canvasLoop() {
      window.requestAnimationFrame(() => {
        // _drawCanvas();
        _queueCanvas();
        _canvasLoop();
      });
    })();
  })
  .catch(err => {
    // do something
    console.error('[promUserMedia.catch] Unable to access video!');
    console.error(err);
  });

const _queueCanvas = () => {
  let tCanvas = _sizeElt(_create('canvas'));
  tCanvas.getContext('2d').drawImage(Layers.video, 0, 0, CUR_WIDTH, CUR_HEIGHT);
  Manip.transform(Layers.transforms, tCanvas, undefined, Layers.bgData);

  Layers.ctxs.forEach((ctx, i) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        ctx.clearRect(0, 0, CUR_WIDTH, CUR_HEIGHT);
        ctx.drawImage(tCanvas, 0, 0, CUR_WIDTH, CUR_HEIGHT);
      });
    }, DELAY * (i + 1));
  });
};

const _drawCanvas = () =>
  Layers.ctxs[0].drawImage(Layers.video, 0, 0, CUR_WIDTH, CUR_HEIGHT);

// ## Controls

(function() {
  $('#display').on('click', function() {
    if (Layers.curClsName === CLS_FULLSCREEN) {
      Layers.showNext();
    }
  });

  let isMoving = false;
  let movingTimeout = null;

  $('#display').on('mousemove', function() {
    if (Layers.curClsName !== CLS_FULLSCREEN) {
      return;
    }

    window.clearTimeout(movingTimeout);

    if (!isMoving) {
      isMoving = true;
      $('body').addClass('is-moving');
    }

    movingTimeout = window.setTimeout(() => {
      isMoving = false;
      $('body').removeClass('is-moving');
    }, 1000);
  });

  $(window).on('keyup', function(e) {
    if (Layers.curClsName === CLS_FULLSCREEN && e.keyCode === 27) {
      Layers.showNext();
    }
  });

  $('#id_delay')
    .on('change keyup', function() {
      let text = $(this).val();
      let val = parseInt(text);
      if (isNaN(val)) {
        console.log(`Invalid number for delay: ${text}`);
      } else {
        DELAY = val;
        // TODO - if val is < previous then we should clear timeouts
      }
    })
    .val(DELAY);

  $('#id_num')
    .on('change keyup', function(e) {
      let text = $(this).val();
      let val = parseInt(text);
      if (isNaN(val)) {
        console.log(`Invalid number for echo: ${text}`);
      } else {
        NUM_CANVASES = val;
      }
      Layers._update();
    })
    .val(NUM_CANVASES)
    .change();

  $('input.transform-check').on('change', function(e) {
    let names = $('input.transform-check')
      .map((_, elt) => {
        let $elt = $(elt);
        return $elt.prop('checked') ? $elt.attr('name') : null;
      })
      .get();
    if (names.indexOf('removeBg') !== -1 && !Layers.bgData) {
      $('#id_setbg').click();
    }
    Layers.transforms = names.map(name => Manip.fn[name]);
  });

  $('#id_changedisplay').on('click', function(e) {
    Layers.showNext();
  });

  $('#id_setbg').on('click', function(e) {
    let bgCanvas = _sizeElt(_create('canvas'));
    let bgCtx = bgCanvas.getContext('2d');
    bgCtx.drawImage(video, 0, 0, CUR_WIDTH, CUR_HEIGHT);
    // Layers.bgCanvas = Manip.transform([Manip.fn.invert], bgCanvas);
    Layers.bgData = bgCtx.getImageData(0, 0, CUR_WIDTH, CUR_HEIGHT).data;
    $('#bg-canvas').remove();
    bgCanvas.id = 'bg-canvas';
    bgCanvas.classList.add('canvas');
    $('#display').append(bgCanvas);
  });
})();
