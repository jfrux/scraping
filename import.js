var fs = require("fs");
var path = require("path");
fs.readdir('./data', function(err,files) {
	if (err) throw err;
	for(f in files) {
		file = files[f];
		console.log(path.join(process.cwd,'/data/',file));
		fs.readFile(path.join(process.cwd,'/data/',file), function (err, data) {
		  
		  var records = data.split('\n');

		  for(record in records) {
		  	cols = record.split('\t');
		  	console.log(cols);
		  }

		});
	}
});