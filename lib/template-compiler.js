var path = require('path');
var CachingWriter = require('broccoli-caching-writer');
var Promise = require('rsvp').Promise;

var mkdirp = require('mkdirp');
var less = require('less');
var symlinkOrCopy = require('symlink-or-copy').sync;
var fs = require('fs');

var hbs = require('handlebars');
var helpers = require('./handlebars-helpers.js');

for (h in helpers) {
  hbs.registerHelper(h, helpers[h]);
}

module.exports = TemplateCompiler;
TemplateCompiler.prototype = Object.create(CachingWriter.prototype)
TemplateCompiler.prototype.constructor = TemplateCompiler;
function TemplateCompiler (templateDir, options) {
  if (!(this instanceof TemplateCompiler)) return new TemplateCompiler(templateDir, options)

  CachingWriter.call(this, templateDir, options)

  this.templateDir = templateDir;
  options = options || {};
  this.destDir = options.destDir || 'styleguide';
}

TemplateCompiler.prototype.updateCache = function (srcDir, destDir) {
  var publicDir = path.join(this.templateDir, 'public');
  var styleguideDestDir = path.join(destDir, this.destDir);
  console.log('Compiling kss template:', srcDir, styleguideDestDir);
  var publicDestDir = path.join(styleguideDestDir, 'public');
  mkdirp.sync(styleguideDestDir);
  symlinkOrCopy(publicDir, publicDestDir);
  var self = this;
  return compileTemplate(path.join(publicDir, 'kss.less'),
      path.join(this.templateDir, 'index.html'),
      path.join(destDir, this.destDir, 'kss.css'))
      .then(function(template) {
        self.template = template;
      })
      .catch(function(err) {
        console.log('Error compiling kss template ', self.templateDir);
        if (err) {
          console.log(err.stack);
        }
      });
}

function compileTemplate(lessFile, templateFile, destCssFile) {
  return new Promise(function (resolve, reject) {
    try {
      var lessKss = fs.readFileSync(lessFile, 'utf8');
      var template = hbs.compile(fs.readFileSync(templateFile, 'utf8'));
      less.render(lessKss, function (err, css) {
        if (err) {
          reject(err);
        } else {
          try {
            fs.writeFileSync(destCssFile, css.css, 'utf8');
            resolve(template);
          } catch (err) {
            reject(err);
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}