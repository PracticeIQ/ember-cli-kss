var mergeTrees = require('broccoli-merge-trees');
var KssCompiler = require('./lib/kss-compiler.js');
var TemplateCompiler = require('./lib/template-compiler.js');

module.exports = {
  name: 'ember-cli-kss',

  included: function(app, parentAddon) {
    var userOptions = app.options['ember-cli-kss'] || {};
    this.options = {
      inputPath: userOptions.inputPath || 'app/styles',
      appCssUrl: userOptions.appCssUrl || app.options.outputPaths.app.css,
      templateDir: userOptions.templateDir
    }
  },

  postprocessTree: function(type, tree) {
    var templateCompiler = new TemplateCompiler(this.options.templateDir);
    var kssCompiler = new KssCompiler(templateCompiler, this.options.inputPath, this.options.appCssUrl);
    return mergeTrees([tree, templateCompiler, kssCompiler]);
  }
};

