
module.exports = function(det, rec, confidence, name, lang) {
    // console.log(det, rec, confidence);
    // this.res = 1;
    this.confidence = confidence;
    this.name       = name || rec.getName();
}