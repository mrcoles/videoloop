// Manip
// =====
//
// Library to manipulate canvas data via various
// transforms.
//

const Manip = {
  transform: (transforms, fromCanvas, toCanvas) => {
    toCanvas = toCanvas || fromCanvas;
    if (!transforms || !transforms.length) {
      return toCanvas;
    }
    let width = fromCanvas.width; // TODO - is this reliable?
    let height = fromCanvas.height;
    let imageData = fromCanvas
      .getContext('2d')
      .getImageData(0, 0, width, height);
    transforms.forEach(transform => transform(imageData.data, width, height));
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
    flipHorizontal: (data, width, height) => {
      let len = data.length;

      let arrayWidth = width * 4;

      for (let i = 0; i < len; i += 4) {
        let y = parseInt(i / arrayWidth);
        let x = i % arrayWidth;

        // 4 * ((arrayWidth / 4) - 1 - (x / 4))
        let xprime = arrayWidth - 4 - x;

        if (xprime <= x) {
          // jump to next row...
          i = (y + 1) * arrayWidth - 4;
          continue;
        }

        let j = y * arrayWidth + xprime;

        let t;
        for (let k = 0; k < 4; k++) {
          t = data[j + k];
          data[j + k] = data[i + k];
          data[i + k] = t;
        }
      }

      return data;
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

export default Manip;

// Test

(() => {
  // test flip horizontal
  let width = 2;
  let height = 2;
  let input = new Uint8ClampedArray(16);
  input[0] = 0;
  input[4] = 1;
  input[8] = 2;
  input[12] = 3;

  let expected = new Uint8ClampedArray(16);
  expected[0] = 1;
  expected[4] = 0;
  expected[8] = 3;
  expected[12] = 2;

  if (input.length !== expected.length) {
    throw new Error('Input and expected are wrong lengths');
  }

  let result = Manip.fn.flipHorizontal(input, width, height);

  console.log('len matches', result.length === expected.length);
  console.log('are same?', result.every((x, i) => expected[i] === x));

  console.log('expected', expected);
  console.log('result', result);
})();
