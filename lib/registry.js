/*jslint browser: true */
/*globals define, require */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'lodash', 'q'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('lodash'), require('q'));
    } else {
        // Browser globals
        factory((root.commonJsStrict = {}), root._, root.q);
    }
}(this, function (exports, lodash, q) {
    'use strict';

    var registry = {};

    /**
     * Mixin de base pour une classe. Il implemente la gestion
     * de l'hydratation automatique des relations. Si les relations
     * n'existent pas dans les donnees passees au constructeur,
     * elles ne seront pas recuperees par magie.
     *
     *
     */
    exports = {

        getModel: function (key) {
            var that = this,
                deferred = q.defer();

            // la clé fournie est déjà un modèle (on ne sait pas si c'est le bon
            // mais on va considérer que oui.
            if (this.isModel(key)) {
                deferred.resolve(key);
                return deferred.promise;
            }

            // Notre registre possède déjà le modèle demandé, on le retourne illico.
            if (this.hasModel(key)) {
                deferred.resolve(registry[key]);
                return deferred.promise;
            }

            // On essaie de charger le modèle demandé. Si on le trouve, on l'enregistre
            // dans le registre (finalement, chui pas sûr que cela soit si utile que ça).
            require([key], function (model) {
                that.loadMixins(model)
                    .then(function (Model) {
                        registry[key] = Model;
                        deferred.resolve(registry[key]);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }, function (err) {
                console.log(key + ' a pas été loadé:', err);
                deferred.reject(new Error(key + ' a pas été loadé'));
            });

            return deferred.promise;
        },

        isModel: function (key) {
            return typeof key === 'function';
        },

        hasModel: function (key) {
            return registry[key] !== undefined && typeof (registry[key]) === 'function';
        },

        loadMixins: function (Model, MainModel) {
            var that = this,
                ToInjectInto = MainModel || Model;

            if (Model.mixins === undefined || lodash.isEmpty(Model.mixins)) {
                return q(ToInjectInto);
            }

            return q.all(lodash.map(Model.mixins, function (options, mixinPath) {
                    var deferred = q.defer();
                    require([mixinPath], function (Mixin) {
                        // merge relations
                        if (Mixin.relations !== undefined) {
                            lodash.merge(ToInjectInto.relations, Mixin.relations);
                        }

                        Mixin.call(ToInjectInto.prototype, options);

                        // merge sub-mixins
                        that.loadMixins(Mixin, ToInjectInto)
                            .then(deferred.resolve);
                    }, function () {
                        deferred.reject('mixin "' + mixinPath + '" not found.');
                    });
                    return deferred.promise;
                }))
                .then(function (results) {
                    return results[0]; // all the same...
                });
        },

        getAll: function () {
            return registry;
        }

    };
    return exports;
}));
