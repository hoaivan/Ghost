const models = require('../../models');
const common = require('../../lib/common');
const urlService = require('../../services/url');
const allowedIncludes = ['author', 'tags', 'authors', 'authors.roles'];
const unsafeAttrs = ['author_id', 'status', 'authors'];
const config = require('../../config');

/**
 * Support main category, secondary category
 * */
function processTags(tags, post) {
    let post_tags_org = post.tags;
    let main_category = post.main_category;
    let secondary_category = post.secondary_category;
    let cho_duyet = post.cho_duyet === '1' ? true : false;
    let post_tags = [];
    let main = null;
    let second = null;

    let tagApprove = null;

    for (let t of tags.models) {
        t = t.attributes;
        if (t.slug === main_category) {
            main = t;
            continue;
        }
        if (secondary_category && t.slug === secondary_category) {
            second = t;
            continue;
        }
        if (t.slug == 'cho-duyet') {
            tagApprove = t;
            continue;
        }
    }

    if (main) post_tags.push(main);
    if (second) post_tags.push(second);
    let categories = config.get('ccbCategories');
    let keys = [];
    for (let k in categories) {
        keys.push(k);
        for (let v of categories[k]) {
            keys.push(v);
        }
    }

    if (post_tags_org) {
        for (let t of post_tags_org) {
            if (t.slug !== main_category
                && t.slug !== secondary_category) {
                if (keys.indexOf(t.slug) < 0) {
                    post_tags.push(t);
                }
            }
        }
    }
    if (cho_duyet && tagApprove) {
        post_tags.push(tagApprove);
    }

    return post_tags;
}

module.exports = {
    docName: 'posts',
    browse: {
        options: [
            'include',
            'filter',
            'fields',
            'formats',
            'status',
            'limit',
            'order',
            'page',
            'debug',
            'absolute_urls'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include',
            'fields',
            'status',
            'formats',
            'debug',
            'absolute_urls'
        ],
        data: [
            'id',
            'slug',
            'status',
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        options: [
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Tag.findAll()
                .then((tags) => {
                    frame.data.posts[0].tags = processTags(tags, frame.data.posts[0]);

                    // org code
                    return models.Post.add(frame.data.posts[0], frame.options)
                        .then((model) => {
                            if (model.get('status') !== 'published') {
                                this.headers.cacheInvalidate = false;
                            } else {
                                this.headers.cacheInvalidate = true;
                            }

                            return model;
                        });
                });
        }
    },

    edit: {
        headers: {},
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            console.log('tags', frame.data.posts[0]);
            return models.Tag.findAll()
                .then((tags) => {
                    frame.data.posts[0].tags = processTags(tags, frame.data.posts[0]);

                    // org code
                    return models.Post.edit(frame.data.posts[0], frame.options)
                        .then((model) => {
                            if (model.get('status') === 'published' ||
                                model.get('status') === 'draft' && model.updated('status') === 'published') {
                                this.headers.cacheInvalidate = true;
                            } else if (model.get('status') === 'draft' && model.updated('status') !== 'published') {
                                this.headers.cacheInvalidate = {
                                    value: urlService.utils.urlFor({
                                        relativeUrl: urlService.utils.urlJoin('/p', model.get('uuid'), '/')
                                    })
                                };
                            } else {
                                this.headers.cacheInvalidate = false;
                            }
                            return model;
                        });
                });
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            frame.options.require = true;

            return models.Post.destroy(frame.options)
                .return(null)
                .catch(models.Post.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.posts.postNotFound')
                    });
                });
        }
    }
};
