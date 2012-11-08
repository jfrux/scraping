var mysql      = require('mysql');
var async = require("async");
var request = require("request");
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'cfr010408',
  database : 'ojects'
});

db.connect();
db.query('SELECT * FROM ojects.categories WHERE hasproducts = \'true\' ORDER BY textpath LIMIT 6000', function(err,rows,fields) {
async.forEachLimit(rows, 10, 
	function(row,callback) {
		 request(row.link, function (error, response, body) {
			  if (!error && response.statusCode == 200) {
			    console.log(body) // Print the google web page.
			  }
			})

		  jsdom.env({
		    html: row.body,
		    scripts: [
		      'http://code.jquery.com/jquery-1.8.2.min.js',
		      'http://viralpatel.net/blogs/demo/jquery/get-text-without-child-element/jquery.justtext.1.0.js'
		    ]
		  }, function(err, window) {
		    var $ = window.jQuery;
		    // jQuery is now loaded on the jsdom window created from 'row.body'
		    
			//current page
		      var bctitle = $(".productsFoundText").justtext().replace(new RegExp('\/','gi'),'').trim();
		      var bclinks = $.map($('.productsFoundText a'),$.text);
		      bclinks.push(bctitle);
		      bclinks = $.map(bclinks,function(link) {
		        if(link.trim().length) {
		          return link.trim();
		        }
		      });

		      var hasSubCats = ($(selector.catlist).text().trim() == 'Browse');
		      var hasProducts = ($(selector.productlist).length > 0);
		      
		      if(regexp.exec(row.url)) {
		        var catKey = regexp.exec(row.url)[0];  
		      } else {
		        var catKey = '';
		      }
		      
		      var parentCat = $(".productsFoundText a:last");
		      if(regexp.test($(parentCat).attr('href'))) {
		        var parentCatKey = regexp.exec($(parentCat).attr('href'))[0];
		      } else {
		        var parentCatKey = '';
		      }
		      
		      var curr_cat = {
		        'name':bctitle,
		        'textpath':bclinks,
		        'key':catKey,
		        'link':row.url,
		        'hassubcats':hasSubCats,
		        'hasproducts':hasProducts,
		        'parentkey':parentCatKey
		      };

		      log("Parsed Category",curr_cat.textpath);
		      var breadcrumbs = bclinks;
		      var title = bctitle;

		      
		      log("Started","Scraping " + curr_cat.name);

		      //products
		      if(hasProducts) {
		        log("comment",newcat.name + '\t' + 'Has products list...');
		        if($(selector.nextPageLink).attr('href')) {
		          var nextLink = $(selector.nextPageLink).attr('href');
		        }
		        
		        var $products = $(selector.productlist);

		        $products.each(function() {
		          var $product = $(this).next('tr');
		          var product = {
		            'key':$product.find(selector.productkey).text().replace('Item #','').trim(),
		            'name':$product.find(selector.productname).text(),
		            'price':$product.find(selector.productprice).text(),
		            'img':'http:' + $product.find(selector.productimg).attr('src'),
		            'cat':newcat.key,
		            '_cat':newcat._id
		          };


		          log("Found Product",product.name);
		          writeProduct(product);
		        });

		        if(nextLink) {
		          log("Add Page", nextLink.replace('http://www.grainger.com',''));
		         
		          row.addUrl(nextLink.replace('http://www.grainger.com',''));  
		        }
		      }

		      window.close();
		      log("Completed","Scraping " + curr_cat.name);
		      agent.next();
			});
	}, function(err){
  
});



});