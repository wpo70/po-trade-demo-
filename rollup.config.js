import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import livereload from 'rollup-plugin-livereload';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import replace from '@rollup/plugin-replace';
// Import postcss for Material UI components
//import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

const sym = ["\\", "|", "/", "―"];
let sp = 0;
function loadSpin() {
  process.stdout.write("\r" + sym[sp++]);
  sp &= 3;
}

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

export default {
  input: 'src/main.js',
  output: {
    inlineDynamicImports: true,
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    svelte({
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production
      },
      emitCss: true,
    }),

    // we'll extract any component CSS out into
    // a separate file - better for performance
    css({ output: 'bundle.css' }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),

    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    commonjs(),
    json(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser()
  ],
  context: 'window',
  onwarn: (warning, warn) => {
    // omit circular dependency warnings emitted from
    // "d3-*" packages and "@carbon/charts"
    // https://github.com/carbon-design-system/carbon-charts/tree/master/packages/svelte#circular-dependency-warnings
    // if (
    //   warning.code === 'CIRCULAR_DEPENDENCY' &&
    //   /^node_modules\/(d3-|@carbon\/charts)/.test(warning.importer)
    // ) {
    //   return;
    // }
    loadSpin();

    // omit A11y warnings
    if (warning.code == 'PLUGIN_WARNING' && warning.message.includes("A11y")) {
      return;
    }

    /*
    REMOVE WARNING: [rollup-plugin-svelte] The following packages did not export their `package.json` file so we could not check the "svelte" field. 
    If you had difficulties importing svelte components from a package, 
    then please contact the author and ask them to export the package.json file.
    */
    const ignored = {
      PLUGIN_WARNING: ['`package.json`'],
    };
    const ignoredKeys = Object.keys(ignored);
    const ignoredValues = Object.values(ignored);
    
    for (let i=0, l = ignoredKeys.length; i< l; ++i) {
      const ignoredKey = ignoredKeys[i];
      const ignoredValue = ignoredValues[i];

      for (const ignoreValuePart of ignoredValue) {
        if ( warning.code !== ignoredKey || !warning.toString().includes(ignoreValuePart) ) {
          continue;
        }
        return;
      }
    }
    process.stdout.write('\r');
    warn(warning);
  },
  watch: {
    clearScreen: false
  }
};
