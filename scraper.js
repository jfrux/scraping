var util = require('util');
var httpAgent = require('http-agent');
var jsdom  = require('jsdom');
var fs = require("fs");
var agent = httpAgent.create('www.grainger.com',['Grainger/fasteners/ecatalog/N-bi6']),
    addPage = true;
var $basecats = '1';
var regexp = new RegExp("(N\-[a-zA-Z0-9]+)");
var selector = {
  'productlist':'.esr_itemListBody > input',
  'productimg':'td:nth-child(2) img',
  'productname':'td:nth-child(3) span a',
  'productkey':'td:nth-child(3) :nth-child(3)',
  'productprice':'td:nth-child(9) div.pirce',
  'basecatlist':'#ProductsMenu li a',
  'catlist':'.searchNavPaneTitle:first',
  'nextPageLink':'.paginationContainer li:last a'
};

function writeCategory(item) {
  var output = [
    item.text.trim(),
    item.path.join(":").replace('Home:',''),
    item.key.trim(),
    item.parentKey.trim()
  ]

  console.log("Writing\t\t");
  fs.appendFileSync('./categories_fasteners.txt',output.join('\t') + '\n','utf8');

  item = null;
  output = null;
}

function writeProduct(item) {
  var output = [
    item.key,
    item.text,
    item.price,
    item.img,
    item.cat_key
  ];

  console.log("Writing\t\t");
  fs.appendFileSync('./products_fasteners.txt',output.join('\t') + '\n','utf8');

  item = null;
  output = null;
}

agent.addListener('next', function (e, agent) {
  util.puts("----------\n");
  util.puts("----------\nConnecting to: " + agent.url);
  // if (addPage) {
  //   // The agent will now also visit 'http://graph.facebook.com/yahoo'
  //   agent.addUrl('yahoo');
  //   //addPage = false;
  // }

  jsdom.env({
    html: agent.body,
    scripts: [
      'http://code.jquery.com/jquery-1.8.2.min.js',
      'http://viralpatel.net/blogs/demo/jquery/get-text-without-child-element/jquery.justtext.1.0.js'
    ]
  }, function (err, window) {
    var $ = window.jQuery;
    // jQuery is now loaded on the jsdom window created from 'agent.body'
    
    //basecats
    if(!$basecats.length) {
      $basecats = $("#ProductsMenu li a");

      $basecats.each(function() {
          basecat = {
            'text':$(this).justtext(),
            'link':$(this).attr('href')
          };
          
          util.puts("Adding url: " + basecat.link.replace('http://www.grainger.com',''));
          agent.addUrl(basecat.link.replace('http://www.grainger.com',''));
      });
    } else {
      //current page
      var bctitle = $(".productsFoundText").justtext().replace(new RegExp('\/','gi'),'').trim();
      var bclinks = $.map($('.productsFoundText a'),$.text);
      bclinks.push(bctitle);
      if(regexp.exec(agent.url)) {
        var catKey = regexp.exec(agent.url)[0];  
      } else {
        var catKey = '';
      }
      
      var parentCat = $(".productsFoundText a")[$(".productsFoundText a").length-2];
      if(parentCat) {
        var parentCatKey = regexp.exec($(parentCat).attr('href'))[0];
      } else {
        var parentCatKey = '';
      }
      
      var curr_cat = {
        'text':bctitle,
        'path':bclinks,
        'key':catKey,
        'parentKey':parentCatKey
      };

      console.log("[" + title + "] Adding category: " + curr_cat.text);
      writeCategory(curr_cat);

      var breadcrumbs = bclinks;
      var title = bctitle;
      console.log(curr_cat);
      console.log("[" + title + "] Scraping...");

      //subcats
      if($(selector.catlist).text().trim() == 'Browse') {
        console.log("[" + title + "] Has sub cats...");
        var $subcats = $(selector.catlist).next('.searchNavPaneContent').find('li a');

        $subcats.each(function() {
          var $cat = $(this);
          var cat = {
            'text':$cat.text(),
            'link':$cat.attr('href')
          }

          
          util.puts("Adding url: " + cat.link.replace('http://www.grainger.com',''));
          agent.addUrl(cat.link.replace('http://www.grainger.com',''));
        });
      }

      //products
      if($(selector.productlist).length) {
        console.log("[" + title + "] Has products list...");

        if($(selector.nextPageLink).attr('href')) {
          var nextLink = $(selector.nextPageLink).attr('href');
        }
        
        var $products = $(selector.productlist);

        $products.each(function() {
          var $product = $(this).next('tr');
          var product = {
            'key':$product.find(selector.productkey).text().replace('Item #','').trim(),
            'text':$product.find(selector.productname).text(),
            'price':$product.find(selector.productprice).text(),
            'img':'http:' + $product.find(selector.productimg).attr('src'),
            'cat_key':curr_cat.key
          };

          console.log("[" + title + "] Adding product: " + JSON.stringify(product));
          writeProduct(product);
        });

        if(nextLink) {
          util.puts("Adding url: " + nextLink.replace('http://www.grainger.com',''));
          agent.addUrl(nextLink.replace('http://www.grainger.com',''));  
        }
        
      }

      curr_cat = null;
    }
    agent.next();
  });
});

agent.addListener('stop', function (e, agent) {
  util.puts('Agent has completed visiting all urls');
});

// Start the agent
agent.start();