/* --------------------
 * sequelize-values Sequelize plugin
 * ------------------*/

// Modules
var _ = require('lodash');

// Imports
var patchesFn = require('./patches');

// Exports

/**
 * Install plugin.
 * Installs on provided Sequelize constructor, or `require('sequelize')` if not provided
 *
 * Adds `.getValues()` and `.getValuesDedup()` to `Sequelize`.
 * Adds `.getValues()` and `.getValuesDedup()` to Model Instance prototype
 *   (`Model` in Sequelize v4, `Sequelize.Instance` in Sequelize v2 or v3).
 *
 * @param {Function} [Sequelize] - Sequelize constructor to install plugin on
 * @returns {Object} - Sequelize constructor for chaining
 */
module.exports = function(Sequelize) {
	if (!Sequelize) Sequelize = require('sequelize');

	var patches = patchesFn(Sequelize);

	// Add getValues methods

	/**
	 * Returns raw values of supplied object/array, including values of nested associations.
	 *
	 * @param {*} item - Data to be converted to raw values
	 * @returns {*} - Raw values
	 */
	Sequelize.getValues = function(item) {
		return getValues(item);
	};

	/**
	 * Returns raw values of supplied object, including values of nested associations.
	 * `instance.getValues()` is same as `Sequelize.getValues(instance)`.
	 *
	 * @this {Sequelize.Instance} - Model Instance to be converted to raw values
	 * @returns {Object} - Raw values
	 */
	patches.instancePrototype.getValues = function() {
		return this.get({plain: true});
	};

	/**
	 * Returns raw values of supplied object/array, including values of nested associations
	 * (like `Sequelize.getValues()`).
	 * Additionally, removes duplicated values where where an associated object is `include`-ed
	 * and the ID of the child or parent is referenced twice.
	 * e.g. `{ userId: 1, user: { id: 1 } }` -> `{ user: { id: 1 } }`
	 *
	 * @this {Sequelize.Instance} - Model Instance to be converted to raw values
	 * @returns {Object} - Raw values
	 */
	Sequelize.getValuesDedup = function(item) {
		return getValues(item, true);
	};

	/**
	 * Returns raw values of supplied object, including values of nested associations with de-duplication.
	 * `instance.getValuesDedup()` is same as `Sequelize.getValuesDedup(instance)`.
	 *
	 * @this {Sequelize.Instance} - Model Instance to be converted to raw values
	 * @returns {Object} - Raw values
	 */
	patches.instancePrototype.getValuesDedup = function() {
		var values = this.get(),
			instanceOptions = patches.instanceOptions(this);

		if (!instanceOptions.include) return values;

		// Loop through all `include`s, removing repeated ID fields.
		// Calls itself recursively to deep traverse the `include` tree.
		instanceOptions.include.forEach(function(include) {
			var association = include.association,
				type = association.associationType,
				as = association.as,
				foreignKey;

			if (type == 'BelongsTo') {
				if (values[as][patches.associationTargetKey(association)] !== undefined) {
					foreignKey = patches.associationForeignKey(association);
					delete values[foreignKey];
				}
				values[as] = values[as].getValuesDedup();
			} else if (type == 'HasOne') {
				values[as] = values[as].getValuesDedup();

				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) {
					foreignKey = patches.associationForeignKey(association);
					delete values[as][foreignKey];
				}
			} else if (type == 'HasMany') {
				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) foreignKey = patches.associationForeignKey(association);

				values[as] = values[as].map(function(item) {
					item = item.getValuesDedup();
					if (foreignKey) delete item[foreignKey];
					return item;
				});
			} else if (type == 'BelongsToMany') {
				var throughAs = include.through.as,
					otherKey = association.otherKey,
					targetPrimaryKey;

				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) foreignKey = patches.associationForeignKey(association);
				if (association.target.primaryKeyCount == 1) targetPrimaryKey = association.target.primaryKeyAttribute;

				values[as] = values[as].map(function(item) {
					var throughItem = item[throughAs].get();
					if (foreignKey) delete throughItem[foreignKey];
					if (targetPrimaryKey && item[targetPrimaryKey] !== undefined) delete throughItem[otherKey];

					item = item.getValuesDedup();

					if (Object.keys(throughItem).length) {
						item[throughAs] = throughItem;
					} else {
						delete item[throughAs];
					}

					return item;
				});
			}
		});

		return values;
	};

	// Return Sequelize for chaining
	return Sequelize;

	/**
	 * Returns raw values of any object, array or any other data type.
	 *   - Sequelize Model Instances are converted to raw values, including the `include`s of each `include`.
	 *   - Arrays are iterated over and `getValues()` called recursively..
	 *   - Objects are iterated over (own keys only) and `getValues()` called recursively.
	 *   - All other values are returned untouched.
	 *
	 * Input data is never modified.
	 *
	 * @param {*} item - Input to be converted to raw values
	 * @param {boolean} dedup - If `true`, de-deuplication is performed (see `Sequelize.getValuesDedup()`)
	 * @returns {*} - Raw values
	 */
	function getValues(item, dedup) {
		// If a Model Instance, call its `.getValues()` / `.getValuesDedup()` method
		if (patches.isModelInstance(item)) return dedup ? item.getValuesDedup() : item.getValues();

		// If array, loop through each item getting values
		if (Array.isArray(item)) {
			return item.map(function(thisItem) {
				return getValues(thisItem, dedup);
			});
		}

		// If is an object, loop through each attribute getting values
		if (_.isPlainObject(item)) {
			return _.mapValues(item, function(value) {
				return getValues(value, dedup);
			});
		}

		// Is not a sequelize instance, an array or an object - return unchanged
		return item;
	}
};
