module.exports.inherits = function(a, b) {
    for (var key of Object.keys(b.prototype)) {
        a.prototype[key] = b.prototype[key];
    }
}
