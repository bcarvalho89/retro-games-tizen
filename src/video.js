const VS = 'attribute vec2 p;varying vec2 t;void main(){t=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0,1);}';
const FS = 'precision mediump float;varying vec2 t;uniform sampler2D s;void main(){gl_FragColor=texture2D(s,t);}';

export function createVideo(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  const shader = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return {
    draw(core) {
      const f = core.frame();
      if (!f.w) return;
      if (canvas.width !== f.w || canvas.height !== f.h) {
        canvas.width = f.w;
        canvas.height = f.h;
        gl.viewport(0, 0, f.w, f.h);
      }
      const px = new Uint16Array(core.heapU8.buffer, f.ptr, f.w * f.h);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, f.w, f.h, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, px);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
