import 'raf-polyfill';
import promUserMedia from './get-user-media';
import $ from 'jquery';

window._$ = $; //REM

let DELAY = 1000;
let NUM_CANVASES = 1;
const WIDTH = 500;
const HEIGHT = 375;

const _create = tag => document.createElement(tag);
const _sizeElt = elt => Object.assign(elt, { width: WIDTH, height: HEIGHT });
const _makeCanvas = () =>
  Object.assign(_sizeElt(_create('canvas')), { className: 'canvas' });

// ## Canvas

const Layers = {
  video: _sizeElt(document.getElementById('video')),
  canvases: [],
  ctxs: [],
  transforms: [],
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

window._Layers = Layers; //REM

promUserMedia({ video: true })
  .then(stream => {
    Layers.video.src = window.URL.createObjectURL(stream);

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
    console.error('Unable to access video!');
    console.error(e);
  });

const _queueCanvas = () => {
  let tCanvas = _sizeElt(_create('canvas'));
  tCanvas.getContext('2d').drawImage(Layers.video, 0, 0, WIDTH, HEIGHT);
  Manip.transform(Layers.transforms, tCanvas);

  Layers.ctxs.forEach((ctx, i) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(tCanvas, 0, 0, WIDTH, HEIGHT);
      });
    }, DELAY * (i + 1));
  });
};

const _drawCanvas = () =>
  Layers.ctxs[0].drawImage(Layers.video, 0, 0, WIDTH, HEIGHT);

// ## Controls

(function() {
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

  $('#id_separate').on('click', function(e) {
    document.body.classList.toggle('separate');
  });

  $('#id_setbg').on('click', function(e) {
    let bgCanvas = _sizeElt(_create('canvas'));
    let bgCtx = bgCanvas.getContext('2d');
    bgCtx.drawImage(video, 0, 0, WIDTH, HEIGHT);
    // Layers.bgCanvas = Manip.transform([Manip.fn.invert], bgCanvas);
    Layers.bgData = bgCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
    $('#bg-canvas').remove();
    bgCanvas.id = 'bg-canvas';
    bgCanvas.classList.add('canvas');
    $('#display').append(bgCanvas);
  });
})();

const Manip = {
  transform: (transforms, fromCanvas, toCanvas) => {
    toCanvas = toCanvas || fromCanvas;
    if (!transforms || !transforms.length) {
      return toCanvas;
    }
    let imageData = fromCanvas
      .getContext('2d')
      .getImageData(0, 0, WIDTH, HEIGHT);
    transforms.forEach(transform => transform(imageData.data));
    toCanvas.getContext('2d').putImageData(imageData, 0, 0);
    return toCanvas;
  },
  fn: {
    invert: data => {
      let len = data.length;
      for (let i = 0; i < len; i += 4) {
        data[i] = 255 - data[i]; // red
        data[i + 1] = 255 - data[i + 1]; // green
        data[i + 2] = 255 - data[i + 2]; // blue
      }
    },
    alpha255: data => {
      let len = data.length;
      for (let i = 0; i < len; i += 4) {
        data[i + 3] = 255;
      }
    },
    alpha0: data => {
      let len = data.length;
      for (let i = 0; i < len; i += 4) {
        data[i + 3] = 0;
      }
    },
    removeBg: data => {
      if (Layers.bgData) {
        let comp = Layers.bgData;
        let len = data.length;
        for (let i = 0; i < len; i += 4) {
          let diff =
            Math.pow(data[i] - comp[i], 2) +
            Math.pow(data[i + 1] - comp[i + 1], 2) +
            Math.pow(data[i + 2] - comp[i + 2], 2);
          if (diff < (window._BGDIFF || 1500)) {
            data[i + 3] = 0;
          }
        }
      }
    }
  }
};
