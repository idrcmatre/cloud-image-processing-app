exports.encodeFileName = (fileName) => {
    return encodeURIComponent(fileName).replace(/[!'()*]/g, escape);
};

exports.decodeFileName = (encodedFileName) => {
    return decodeURIComponent(encodedFileName);
};
