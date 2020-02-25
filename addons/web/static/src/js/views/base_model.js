odoo.define('web.base_model', function (require) {
    "use strict";

    const { Context, Component, core } = owl;
    const { Observer } = core;

    /**
     * The purpose of the class BaseModel and the corresponding hooks
     * is to offers something similar to an owl store but with no automatic
     * notification of components when the observed state changes.
     * Instead, one should call the __notifyComponents function whenever
     * it should be useful. Nevertheless, when the dispatch method is
     * properly called, a notifcation do take place automatically.
     */

    class BaseModel extends Context {
        /**
         * @param {Object} config
         * @param {Object} config.env
         * @param {Object} config.state
         */
        constructor(config) {
            super(config.state);
            // avoid automatic notification via notifyCB of Context
            // but keep mechanism of observer and revision of context
            this.observer.notifyCB = () => { };
            this.env = config.env;

            this.mutations = {};
            this.getters = {};
            this.updateFunctions = [];
        }

        //-------------------------------------------------------------------------
        // Public
        //-------------------------------------------------------------------------

        /**
         * Call the base model method with given name with the arguments
         * determined by the dispatch extra arguments.
         * A preleminary check that the method has been assed to be
         * a mutation is done.
         *
         * @param {string} mutation
         * @param  {...any} payload
         * @returns {any}
         */
        async dispatch(mutation, ...payload) {
            if (!this.mutations[mutation]) {
                throw new Error(`[Error] mutation ${mutation} is undefined`);
            }
            const result = await this[mutation](...payload);
            return result;
        }

        //-------------------------------------------------------------------------
        // Private
        //-------------------------------------------------------------------------

        /**
         * Expose a method of the base model with given name 'getter'
         * in the getters object accessible via the hook useGetters.
         *
         * @param {string} getter
         */
        _registerGetter(getter) {
            this.getters[getter] = this[getter].bind(this);
        }

        /**
         * Allow to use a method of the base model with given name 'mutation'
         * via the dispatch method.
         *.
         * @param {string} mutation
         */
        _registerMutation(mutation) {
            this.mutations[mutation] = 1;
        }
    }

    // This function is just a copy of the same function in owl.js
    // The fact is that it is not exported.
    function useContextWithCB(ctx, component, method) {
        const __owl__ = component.__owl__;
        const id = __owl__.id;
        const mapping = ctx.mapping;
        if (id in mapping) {
            return ctx.state;
        }
        if (!__owl__.observer) {
            __owl__.observer = new Observer();
            __owl__.observer.notifyCB = component.render.bind(component);
        }
        const currentCB = __owl__.observer.notifyCB;
        __owl__.observer.notifyCB = function () {
            if (ctx.rev > mapping[id]) {
                // in this case, the context has been updated since we were rendering
                // last, and we do not need to render here with the observer. A
                // rendering is coming anyway, with the correct props.
                return;
            }
            currentCB();
        };
        mapping[id] = 0;
        const renderFn = __owl__.renderFn;
        __owl__.renderFn = function (comp, params) {
            mapping[id] = ctx.rev;
            return renderFn(comp, params);
        };
        ctx.on("update", component, async (contextRev) => {
            if (mapping[id] < contextRev) {
                mapping[id] = contextRev;
                await method();
            }
        });
        const __destroy = component.__destroy;
        component.__destroy = parent => {
            ctx.off("update", component);
            delete mapping[id];
            __destroy.call(component, parent);
        };
        return ctx.state;
    }

    const isStrictEqual = (a, b) => a === b;

    function useBaseModel(selector, options = {}) {
        const component = Component.current;
        const componentId = component.__owl__.id;
        const baseModel = options.baseModel || component.env.baseModel;
        if (!(baseModel instanceof BaseModel)) {
            throw new Error(`No baseModel found when connecting '${component.constructor.name}'`);
        }
        let result = selector(baseModel.state, component.props);
        const hashFn = baseModel.observer.revNumber.bind(baseModel.observer);
        let revNumber = hashFn(result);
        const isEqual = options.isEqual || isStrictEqual;
        if (!baseModel.updateFunctions[componentId]) {
            baseModel.updateFunctions[componentId] = [];
        }
        function selectCompareUpdate(state, props) {
            const oldResult = result;
            result = selector(state, props);
            const newRevNumber = hashFn(result);
            if ((newRevNumber > 0 && revNumber !== newRevNumber) || !isEqual(oldResult, result)) {
                revNumber = newRevNumber;
                if (options.onUpdate) {
                    options.onUpdate(result);
                }
                return true;
            }
            return false;
        }
        baseModel.updateFunctions[componentId].push(function () {
            return selectCompareUpdate(baseModel.state, component.props);
        });
        useContextWithCB(baseModel, component, function () {
            let shouldRender = false;
            for (let fn of baseModel.updateFunctions[componentId]) {
                shouldRender = fn() || shouldRender;
            }
            if (shouldRender) {
                return component.render();
            }
        });
        // onWillUpdateProps(props => {
        //     selectCompareUpdate(baseModel.state, props);
        // });
        const __destroy = component.__destroy;
        component.__destroy = parent => {
            delete baseModel.updateFunctions[componentId];
            __destroy.call(component, parent);
        };
        if (typeof result !== "object" || result === null) {
            return result;
        }
        return new Proxy(result, {
            get(target, k) {
                return result[k];
            },
            set(target, k, v) {
                throw new Error("Model state should only be modified through mutations");
            },
            has(target, k) {
                return k in result;
            }
        });
    }
    function useDispatch(baseModel) {
        baseModel = baseModel || Component.current.env.baseModel;
        return baseModel.dispatch.bind(baseModel);
    }
    function useGetters(baseModel) {
        baseModel = baseModel || Component.current.env.baseModel;
        return baseModel.getters;
    }

    return {
        BaseModel,
        useBaseModel,
        useDispatch,
        useGetters
    };
});