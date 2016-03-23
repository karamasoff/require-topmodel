/*jslint browser: true */
/*globals define, require */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['lodash', 'q'], factory);
    } else {
        // Browser globals
        root.amdWeb = factory(root._, root.Q);
    }
}(this, function (lodash, Q) {
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
    return {

        getModel: function (key) {
            var that = this,
                deferred = Q.defer();

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
                that.loadMixins(model).then(function (Model) {
                    registry[key] = Model;
                    deferred.resolve(registry[key]);
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

            if (Model.mixins === undefined) {
                return Q(ToInjectInto);
            }

            return Q.all(lodash.map(Model.mixins, function (options, mixinPath) {
                    var deferred = Q.defer();
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
}));
