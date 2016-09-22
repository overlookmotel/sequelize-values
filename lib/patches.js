/* --------------------
 * sequelize-values Sequelize plugin
 * Patched versions of sequelize methods which unify interface across Sequlize versions 2.x.x, 3.x.x and 4.x.x
 * ------------------*/

// Modules
var semverSelect = require('semver-select');

var sequelizeVersionImported = require('sequelize/package.json').version;

// Exports

/**
 * Define universal interface across Sequelize v2, v3 and v4 to work around API changes between versions.
 * @param {Function} Sequelize - Sequelize constructor to base patches on
 */
module.exports = function(Sequelize) {
    // Get Sequelize version
    // NB This is not reliable where an old version of Sequelize
    // which does not have a `version` attribute is provided.
    var sequelizeVersion = Sequelize.version || sequelizeVersionImported;

    // Define patches based on Sequelize version
    return semverSelect.object(sequelizeVersion, {
        /*
         * Patches to unify function signature changes between Sequelize v2, v3 and v4
         */
        instanceOptions: {
            '2.0.0 - 3.8.x': function(instance) {
                return instance.options;
            },
            '^3.9.0': function(instance) {
                return instance.$options;
            },
            '>=4.0.0-0': function(instance) {
                return instance._options;
            }
        },
        associationForeignKey: {
            '^2.0.0': function(association) {
                return association.identifier;
            },
            '>=3.0.0 || ^4.0.0-0': function(association) {
                return association.foreignKey;
            }
        },
        associationTargetKey: {
            '^2.0.0': function(association) {
                return association.targetIdentifier;
            },
            '>=3.0.0 || ^4.0.0-0': function(association) {
                return association.targetKey;
            }
        },
        /*
         * In Sequelize v2 + v3:
         *   - models are instanceof Sequelize.Model
         *   - model instances are instanceof model.Instance
         *   - model.Instance is subclass of Sequelize.Instance
         *   - models instances have a property `.Model` referring to the model they are one of
         *
         * In Sequelize v4:
         *   - models are subclasses of Sequelize.Model
         *   - model instances are instanceof their Model + therefore also instanceof Sequelize.Model
         *   - Sequelize.Instance does not exist
         *
         * The patches below account for these changes.
         */
        instancePrototype: {
            '2.0.0 - 3.x.x': (Sequelize.Instance || {}).prototype,
            '>=4.0.0-0': Sequelize.Model.prototype
        },
        isModelInstance: {
            '2.0.0 - 3.x.x': function(item) {
                return item instanceof Sequelize.Instance;
            },
            '>=4.0.0-0': function(item) {
                return item instanceof Sequelize.Model;
            }
        }
    });
};
