const Spline = require('cubic-spline');

module.exports = class CustomSpline {
    constructor(xs, ys, useLinearInterp){
      this.xs = xs;
      this.ys = ys;
      this.useLinearInterp = useLinearInterp;
      this.cubic_spline = null;
    }

    at(x) {
        const { xs, ys, useLinearInterp } = this;
        if(useLinearInterp){
          // Find the index of the data point immediately below x
          let i = 0;
          while (i < xs.length - 1 && x > xs[i + 1]) {
            i++;
          }
          //Formula for Linear Interpolation 
          const interpolatedY = ys[i] + ((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])) * (x - xs[i]);
          return interpolatedY;
        } else {
          if(!this.cubic_spline){
            this.cubic_spline = new Spline(xs, ys);
          }
          return this.cubic_spline.at(x)
        }
    }
  }
