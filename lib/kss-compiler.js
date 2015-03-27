var path = require('path');
var fs = require('fs');
var CachingWriter = require('broccoli-caching-writer');
var Promise = require('rsvp').Promise;
var kss = require('kss');
var cheerio = require('cheerio');
var mkdirp = require('mkdirp');
var marked = require('marked');

var template; // pulled from templateTree

module.exports = KssCompiler;
KssCompiler.prototype = Object.create(CachingWriter.prototype)
KssCompiler.prototype.constructor = KssCompiler;

function KssCompiler (templateTree, stylesDir, appCssUrl, options) {
  console.log('OPTIONS', templateTree, options)
  if (!(this instanceof KssCompiler)) return new KssCompiler(templateTree, stylesDir, options)

  CachingWriter.call(this, [templateTree, stylesDir], options)

  this.templateTree = templateTree;
  this.stylesDir = stylesDir;
  this.appCssUrl = appCssUrl;
  options = options || {};
  this.destDir = options.destDir || 'styleguide';
  this.appDir = '../../app/templates/catalogue';
}

KssCompiler.prototype.updateCache = function (srcDir, destDir) {
  var styleguideDestDir = path.join(destDir, this.destDir);
  var outputDestDir = path.join(destDir, this.appDir);

  // console.log('Compiling kss styleguide:', this.stylesDir, 'to', styleguideDestDir);
  template = this.templateTree.template;

  var self = this;
  return parseStyleguide(this.stylesDir)
      .then(function(styleguide) {
        // console.log(styleguideDestDir);
        mkdirp(styleguideDestDir);

        // ADDED
        mkdirp(outputDestDir);

        var sections = styleguide.section();
        var sectionRoots = getSectionRootNames(sections);
        prepareFilteredMarkup(sections);

        try {
          var pages = {};
          for (var i = 0; i < sectionRoots.length; i++) {
            var sectionRoot = sectionRoots[i];
            var childSections = styleguide.section(sectionRoot + '.*');

            // console.log('generatePage:', sectionRoot);

            generatePage(
                outputDestDir,
                styleguide, childSections,
                sectionRoot, pages, sectionRoots, self.appCssUrl
            );
          }

          generateIndex(styleguideDestDir, self.stylesDir + '/styleguide.md', styleguide, childSections, pages, sectionRoots, self.appCssUrl);
        } catch (err) {
          console.log('Error while generating styleguide', err.stack);
        }
      }).catch(function(err) {
        console.log('Error compiling kss styleguide ', self.stylesDir);
        if (err) {
          console.log(err.stack);
        }
      });
}

function parseStyleguide(stylesDir) {
  return new Promise(function(resolve, reject) {
    kss.traverse(stylesDir, {
      multiline: true,
      markdown: true,
      markup: true,
      mask: kss.precompilers.mask
    }, function (err, styleguide) {
      if (err) {
        reject(err);
      } else {
        resolve(styleguide);
      }
    });
  });
}

function prepareFilteredMarkup(sections) {
  sections.forEach(function(v) {
    v.data.filteredMarkup = getFilteredMarkup(v.data.markup);
  });
}

function getFilteredMarkup(markup) {
  $ = cheerio.load(markup);

  var processNode = function(parent) {
    parent.removeAttr('style');
    var children = parent.contents();

    if (parent.attr('kss-dummy-node') !== undefined) {
      parent.remove();
      return;
    } else if (parent.attr('kss-dummy-parent') !== undefined) {
      parent.after(children);
      parent.remove();
    }

    for (var i = 0 ; i < children.length ; i++) {
      var current = children[i];
      if (current.type == 'tag') {
        processNode($(current));
      }
    }
  }

  processNode($.root());

  return $.html();
}

function getSectionRootNames(sections) {
  var rootSectionNames = [];
  for (var i = 0; i < sections.length ; i++) {
    var currentRoot = sections[i].reference().match(/[0-9]*\.?/)[0].replace('.', '');
    if (!~rootSectionNames.indexOf(currentRoot)) {
      rootSectionNames.push(currentRoot);
    }
  }
  rootSectionNames.sort();
  return rootSectionNames;
}

function generatePage(outputDir, styleguide, sections, root, pages, sectionRoots, appCssUrl) {
  console.log(
      '...generating section ' + root + ' [',
      styleguide.section(root) ? styleguide.section(root).header() : 'Unnamed',
      ']'
  );
  console.log('outputdir', outputDir)
  fs.writeFileSync(outputDir + '/section-' + root + '.hbs',
      template({
        styleguide: styleguide,
        sections: jsonSections(sections),
        rootNumber: root,
        sectionRoots: sectionRoots,
        overview: false,
        appCssUrl: appCssUrl
      })
  );
}

function generateIndex(outputDir, styleguideMdPath, styleguide, sections, pages, sectionRoots, appCssUrl) {
  var overviewText;
  console.log('...generating styleguide homepage overview');
  // Ensure overview is a non-false value.
  try {
    overviewText = ' ' + marked(fs.readFileSync(styleguideMdPath, 'utf8'));
  } catch (e) {
    overviewText = ' ';
    console.log('...no homepage content found:', e.message);
  }
  try {
    fs.writeFileSync(outputDir + '/index.html',
        template({
          styleguide: styleguide,
          sectionRoots: sectionRoots,
          sections: jsonSections(sections),
          rootNumber: 0,
          overview: overviewText,
          appCssUrl: appCssUrl
        })
    );
  } catch (e) {
    console.log('...no styleguide overview generated:', e.message);
  }
}

function jsonSections(sections) {
  return sections.map(function (section) {
    return {
      header: section.header(),
      description: section.description(),
      reference: section.reference(),
      depth: section.data.refDepth,
      deprecated: section.deprecated(),
      experimental: section.experimental(),
      modifiers: jsonModifiers(section.modifiers())
    };
  });
}

function jsonModifiers(modifiers) {
  return modifiers.map(function (modifier) {
    return {
      name: modifier.name(),
      description: modifier.description(),
      className: modifier.className()
    };
  });
}
