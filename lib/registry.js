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

        loadMixins: function (Model) {
            var deferred = Q.defer();
            if (Model.mixins === undefined) {
                deferred.resolve(Model);
                return deferred.promise;
            }
            Q.all(lodash.map(Model.mixins, function (options, mixinPath) {
                var deferred2 = Q.defer();
                require([mixinPath], function (Mixin) {
                    Mixin.call(Model.prototype, options);
                    deferred2.resolve(true);
                }, function () {
                    deferred2.reject('mixin "' + mixinPath + '" not found.');
                });
                return deferred2.promise;
            })).then(function () {
                deferred.resolve(Model);
            });

            return deferred.promise;
        },

        getAll: function () {
            return registry;
        }

    };
}));
