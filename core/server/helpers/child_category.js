// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var proxy = require('./proxy'),
    SafeString = proxy.SafeString,
    getMetaDataUrl = proxy.metaData.getMetaDataUrl;
    logging = proxy.logging,
    i18n = proxy.i18n,
    models = proxy.models,
    hbsUtils = proxy.hbs.Utils,
    _ = require('lodash'),
    createFrame = proxy.hbs.handlebars.createFrame;

module.exports = function child_category(options) {
    var categories = options.data.config.categories;
    var current_tag = options.hash.slug;
    var fn = options.fn,
        length = _.size(categories[current_tag]),
        output = '',
        from = 1,
        to = length,
        data;
    var items = categories[current_tag];
    if (options.data) {
        data = createFrame(options.data);
    }

    function execIteration(field, index, last) {
        if (data) {
            data.key = field;
            data.index = index;
            data.number = index + 1;
            data.value = items[field];
        }
        
        // for each category find post here
        data.categories = items[field];
        output = output + fn(data, {
            data: data,
            blockParams: hbsUtils.blockParams([items[field], field])
        });
    }

    function iterateCollection(context) {
        // Context is all posts on the blog
        var current = 1;

        // For each post, if it is a post number that fits within the from and to
        // send the key to execIteration to set to be added to the page
        _.each(context, function (item, key) {
            if (current < from) {
                current += 1;
                return;
            }

            if (current <= to) {
                execIteration(key, current - 1, current === to);
            }
            current += 1;
        });
    }

    iterateCollection(items);
    return output;
};
