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

export default Manip;
