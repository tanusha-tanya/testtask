'use strict';

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const prefix = require('gulp-autoprefixer');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const changed = require('gulp-changed');
const spritesmith = require('gulp.spritesmith');
const svg = require('gulp-svg-sprite');
const useref = require('gulp-useref');
const size = require('gulp-size');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const wiredep = require('wiredep').stream;
const del = require('del');
const browserSync = require('browser-sync').create();
const reload = browserSync.reload;

gulp.task('styles', function() {
  return gulp.src('app/styles/*.scss')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', sass.logError))
    .pipe(prefix({browsers: ['> 5%', 'last 4 versions', 'Firefox ESR']}))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', function () {
  return gulp.src('app/templates/**/*.js')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))    
    .pipe(sourcemaps.init())
    .pipe(babel({
        presets: ['es2015', 'env']
    }))
    .pipe(concat('all.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(changed('.tmp/scripts'))
    .pipe(gulp.dest('.tmp/scripts'))
});
gulp.task('js-libs', function() {
    return gulp.src([
					'./node_modules/jquery/dist/jquery.js',
					'app/libs/foreachpolyfill.js'				   
               ])
               .pipe(concat('libs.js'))
               .pipe(gulp.dest('.tmp/scripts'))               
});

gulp.task('template', function () {
  return gulp.src('app/templates/*.pug')
    .pipe(plumber({
        errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(changed('.tmp'))
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('.tmp'))
});

/**
 * ФОРМИРОВАНИЕ СПРАЙТА.
 * В gulp.src указываем папку для конкретного набора спрайтов,
 * чтобы не раздувать какой то один спрайт.
 * В итоге у нас получится несколько спрайтов для конкретных страниц/экранов
 */
gulp.task('sprites', function() {
  var prefix = 'be';
  var data = gulp.src('app/images/' + prefix + '-sprites/*.png')
    .pipe(spritesmith({
      retinaSrcFilter: 'app/images/' + prefix + '-sprites/*-2x.png',
      imgName: prefix + '-sprite.png',
      retinaImgName: prefix + '-sprite-2x.png',
      cssName: '_' + prefix + '-sprite.scss',
      retinaImgPath: '../images/' + prefix + '-sprite-2x.png',
      imgPath: '../images/' + prefix + '-sprite.png',
      algorithm: 'top-down',
      cssVarMap: function (sprite) {
        sprite.name = prefix + '_' + sprite.name;
      }
    }));

  data.img.pipe(gulp.dest('.tmp/images'));
  data.css.pipe(gulp.dest('.tmp/styles'));
});

var config = {
  mode: {
    symbol: {
      sprite: 'sprite.svg',
      dest: '',
      example: true
    },
  }
};

gulp.task('svg', function () {
  return gulp.src('app/images/svg/**/*.svg')
    .pipe(svg(config))
    .pipe(gulp.dest('.tmp/images'));
});

gulp.task('html', ['template', 'styles', 'scripts'], function() {
  return gulp.src(['app/*.html', '.tmp/*.html'])
    .pipe(useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('images', function() {
  return gulp.src('app/images/**/*')
    .pipe(cache(imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{ cleanupIDs: false }]
    })))
    .pipe(gulp.dest('.tmp/images'));
});
// inject bower components
gulp.task('wiredep', function() {
    gulp.src('app/styles/main.scss')
        .pipe(wiredep({ignorePath: /^(\.\.\/)+/}))
        .pipe(gulp.dest('.tmp/styles'));

    gulp.src(['app/templates/_layouts/*.pug'])
        .pipe(wiredep({ignorePath: /^(\.\.\/)*\.\./}))
        .pipe(gulp.dest('.tmp/templates/_layouts'));
});

gulp.task('extras', function() {
  return gulp.src([
    'app/*.*',
	'app/fonts',
	'app/libs',
	'app/assets/',
	'.tmp',
    '!app/*.html',
    '!app/*.pug'
  ], {
      dot: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

// Gulp watch
gulp.task('watch', function () {
  gulp.watch('app/styles/**/*.scss', ['styles']);
  gulp.watch('app/templates/**/*.scss', ['styles'])
  gulp.watch('app/templates/**/*.js', ['scripts']);
  gulp.watch('app/templates/**/*.pug', ['template']);
  gulp.watch('app/images/svg/**/*.svg', ['svg']);
  gulp.watch('app/images/sprite/**/*.png', ['sprites']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('s', ['styles', 'scripts', 'template', 'sprites', 'svg', 'watch'], function() {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['.tmp', 'app'],
      files: [".tmp/styles/*.css", ".tmp/*.html", ".tmp/scripts/*.js"]
    }
  });

  browserSync.watch('.tmp/**/*.*').on('change', reload);
});

gulp.task('s:d', function() {
  browserSync.init({
    notify: false,
    port: 3000,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('build', ['html', 'images', 'extras'], function() {
  return gulp.src('dist/*').pipe(size({ title: 'build', gzip: true }));
});

gulp.task('default', ['clean'], function() {
  gulp.start('build');
});
