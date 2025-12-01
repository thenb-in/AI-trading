import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';

class ChoicesUtil {
  constructor() {
    this.instances = {};
    this.configs = {}; // Store configuration separately
  }

  // Initialize a Choices instance
  initializeChoices(selectRef, config) {
    const {
      name,
      searchEnabled = true,
      placeholder = 'Select an option',
      searchPlaceholder = 'Search...',
      choices = [],
      defaultValue = null,
      onChange = null,
      multiselect = false,
      clearable = false
    } = config;

    if (!selectRef) {
      console.warn(`[ChoicesUtil] ⚠️ selectRef missing for '${name}'`);
      return null;
    }

    // If instance already exists, return it (no re-init)
    if (this.instances[name]) {
      return this.instances[name];
    }

    const choicesInstance = new Choices(selectRef, {
      removeItemButton: multiselect || clearable,
      searchEnabled,
      placeholderValue: placeholder,
      searchPlaceholderValue: searchPlaceholder,
      itemSelectText: '',
      allowHTML: false,
      duplicateItemsAllowed: false,
      shouldSort: false,
      searchResultLimit: 20,
      searchChoices: true,
      fuseOptions: {
        threshold: 0.1,
        ignoreLocation: true,
        minMatchCharLength: 1,
      },
      position: 'auto',
      classNames: {
        containerOuter: 'choices',
        containerInner: 'choices__inner',
        input: 'choices__input',
        listDropdown: 'choices__list--dropdown',
        item: 'choices__item',
        itemSelectable: 'choices__item--selectable',
        itemChoice: 'choices__item--choice',
      },
    });

    // Store configuration
    this.configs[name] = {
      multiselect,
      defaultValue
    };

    // Set choices
    if (choices.length > 0) {
      choicesInstance.setChoices(choices, 'value', 'label', true);
    }

    // Apply default value safely
    if (defaultValue !== null && defaultValue !== undefined) {
      choicesInstance.removeActiveItems();
      if (multiselect && Array.isArray(defaultValue)) {
        defaultValue.forEach(v => {
          const val = (typeof v === 'object' && v !== null && 'value' in v) ? v.value : v;
          if (val !== null && val !== undefined) choicesInstance.setChoiceByValue(val);
        });
      } else {
        const val = (typeof defaultValue === 'object' && defaultValue !== null && 'value' in defaultValue) ? defaultValue.value : defaultValue;
        if (val !== null && val !== undefined) choicesInstance.setChoiceByValue(val);
      }
    }

    // Add generic event listeners if provided
    if (onChange) {
      try {
        choicesInstance.passedElement.element.addEventListener('change', onChange);
        choicesInstance.passedElement.element.addEventListener('choice', onChange);
        if (multiselect) {
          choicesInstance.passedElement.element.addEventListener('removeItem', onChange);
        }
      } catch (err) {
        // Some environments may not expose passedElement exactly; guard it
        console.warn('[ChoicesUtil] Could not attach generic onChange listeners:', err);
      }
    }

    this.instances[name] = choicesInstance;
    return choicesInstance;
  }

  // Initialize role dropdown (handler attached AFTER instance creation)
  initializeRoleChoices(selectRef, roles = [], onChange, multiselect = false, clearable = false) {
    const choices = [
      { value: 'all', label: 'All Roles' },
      ...roles.map(role => ({
        value: role.id ? role.id.toString() : role.value,
        label: role.name || role.label,
      }))
    ];

    // Create instance without an onChange so we can attach a safe handler after instance exists
    const instance = this.initializeChoices(selectRef, {
      name: 'role',
      placeholder: 'Select role(s)',
      searchPlaceholder: 'Search roles',
      choices,
      defaultValue: multiselect ? ['all'] : 'all',
      onChange: null,
      multiselect,
      clearable
    });

    if (!instance) return null;

    // Re-entrancy guard
    let isHandling = false;

    // Safe handler that doesn't force-revert user selection
    const handler = () => {
      if (isHandling) return;
      isHandling = true;
      try {
        // getValue(true) returns array for multiselect, string for single
        const raw = instance.getValue(true);
        const arr = Array.isArray(raw) ? raw.filter(v => v !== '' && v != null) : [raw];

        console.log('[ChoicesUtil] role change:', arr);

        // Nothing selected -> fallback to 'all'
        if (!arr || arr.length === 0) {
          instance.removeActiveItems();
          instance.setChoiceByValue('all');
          if (onChange) onChange({ target: { value: instance.getValue(true) } });
          return;
        }

        if (multiselect) {
          // If 'all' selected with others -> drop 'all' and re-apply the others
          if (arr.includes('all') && arr.length > 1) {
            const keep = arr.filter(v => v !== 'all' && v !== '' && v != null);
            instance.removeActiveItems();
            keep.forEach(v => instance.setChoiceByValue(v));
          }
        } else {
          // Single select: if falsy, fallback to 'all'
          if (!arr[0] || arr[0] === '') {
            instance.removeActiveItems();
            instance.setChoiceByValue('all');
          }
        }

        // Propagate simplified value to external handler
        if (onChange) {
          onChange({ target: { value: instance.getValue(true) } });
        }
      } catch (err) {
        console.error('[ChoicesUtil] Error in role change handler:', err);
      } finally {
        isHandling = false;
      }
    };

    // Attach to a set of safe events
    try {
      const el = instance.passedElement.element;
      el.addEventListener('change', handler);
      el.addEventListener('choice', handler);
      el.addEventListener('addItem', handler);
      el.addEventListener('removeItem', handler);
    } catch (err) {
      console.warn('[ChoicesUtil] Could not attach role handler events:', err);
    }

    return instance;
  }

  // Initialize user dropdown
  initializeUserChoices(selectRef, users = [], onChange) {
    const choices = [
      { value: 'all', label: 'All Users' },
      ...users.map(user => ({
        value: user.id ? user.id.toString() : user.value,
        label: user.name || user.label || user.username,
      }))
    ];

    return this.initializeChoices(selectRef, {
      name: 'user',
      placeholder: 'Select a user',
      searchPlaceholder: 'Search users',
      choices,
      defaultValue: 'all',
      onChange,
      multiselect: false,
      clearable: true
    });
  }

  // Set value on existing instance
  setValue(name, value, isMultiselect = false) {
    const instance = this.instances[name];
    if (!instance) {
      console.warn(`[ChoicesUtil] ⚠️ Choices instance not found for '${name}'`);
      return;
    }

    console.log(`[ChoicesUtil] 🔹 Setting value for '${name}':`, value, `(initial isMultiselect: ${isMultiselect})`);

    // If caller left isMultiselect as default false, use stored config if available
    if (isMultiselect === false && this.configs && this.configs[name]) {
      isMultiselect = this.configs[name].multiselect;
      console.log(`[ChoicesUtil] 🔄 Using stored config for '${name}': isMultiselect = ${isMultiselect}`);
    }

    // Clear previous selections before applying
    instance.removeActiveItems();

    if (isMultiselect) {
      if (Array.isArray(value)) {
        console.log(`[ChoicesUtil] 🔹 Multiselect array detected. Applying values:`, value);
        value.forEach(v => {
          const val = (typeof v === 'object' && v !== null && 'value' in v) ? v.value : v;
          if (val !== null && val !== undefined) instance.setChoiceByValue(val);
        });
      } else {
        const val = (typeof value === 'object' && value !== null && 'value' in value) ? value.value : value;
        if (val !== null && val !== undefined) instance.setChoiceByValue(val);
      }
    } else {
      if (value === null || value === undefined) {
        console.warn(`[ChoicesUtil] ⚠️ Single-select value is null or undefined for '${name}'`);
      } else {
        const val = (typeof value === 'object' && value !== null && 'value' in value) ? value.value : value;
        instance.setChoiceByValue(val);
      }
    }

    console.log(`[ChoicesUtil] ✅ Value set for '${name}'`);
  }

  // Reset a specific dropdown to default value
  resetChoices(name, defaultValue) {
    const instance = this.instances[name];
    if (!instance) return;

    const cfg = this.configs[name] || { multiselect: false, defaultValue: undefined };
    const isMulti = cfg.multiselect;

    // Clear
    instance.removeActiveItems();

    if (isMulti) {
      const valueArray = Array.isArray(defaultValue) ? defaultValue : (Array.isArray(cfg.defaultValue) ? cfg.defaultValue : []);
      valueArray.forEach(v => {
        const val = (typeof v === 'object' && v !== null && 'value' in v) ? v.value : v;
        if (val !== null && val !== undefined) instance.setChoiceByValue(val);
      });
    } else {
      const val = (defaultValue !== undefined && defaultValue !== null) ? defaultValue : (cfg.defaultValue !== undefined ? cfg.defaultValue : 'all');
      instance.setChoiceByValue(val);
    }
  }

  // Reset all dropdowns
  resetAllChoices() {
    Object.keys(this.instances).forEach(name => {
      const cfg = this.configs[name] || {};
      const defaultVal = ('defaultValue' in cfg) ? cfg.defaultValue : (cfg.multiselect ? [] : 'all');
      this.resetChoices(name, defaultVal);
    });
  }

  // Destroy a specific instance
  destroyChoices(name) {
    if (this.instances[name]) {
      try {
        this.instances[name].destroy();
      } catch (err) {
        console.warn(`[ChoicesUtil] Error destroying instance '${name}':`, err);
      }
      delete this.instances[name];
    }
    if (this.configs[name]) {
      delete this.configs[name];
    }
  }

  // Destroy all instances
  destroyAllChoices() {
    Object.keys(this.instances).forEach(name => {
      this.destroyChoices(name);
    });
    this.instances = {};
    this.configs = {};
  }

  // Get instance by name
  getInstance(name) {
    return this.instances[name];
  }

  // Check if instance exists
  hasInstance(name) {
    return !!this.instances[name];
  }
}

export { ChoicesUtil };
