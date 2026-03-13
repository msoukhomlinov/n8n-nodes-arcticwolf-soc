const { src, dest } = require('gulp');

function buildIcons() {
  return src('src/nodes/**/*.svg', { base: 'src' }).pipe(dest('dist'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;
