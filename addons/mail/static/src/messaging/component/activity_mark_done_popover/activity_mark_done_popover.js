odoo.define('mail.messaging.component.ActivityMarkDonePopover', function (require) {
'use strict';

const useStore = require('mail.messaging.component_hook.useStore');

const { Component } = owl;
const { useDispatch, useRef } = owl.hooks;

class ActivityMarkDonePopover extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const activity = state.activities[props.activityLocalId];
            return { activity };
        });
        this._feedbackTextareaRef = useRef('feedbackTextarea');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {mail.messaging.entity.Activity}
     */
    get activity() {
        return this.storeProps.activity;
    }

    /**
     * @returns {string}
     */
    get DONE_AND_SCHEDULE_NEXT() {
        return this.env._t("Done & Schedule Next");
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickDiscard() {
        this.trigger('o-discard-clicked');
    }

    /**
     * @private
     */
    _onClickDone() {
        this.storeDispatch('markActivityAsDone', this.props.activityLocalId, {
            feedback: this._feedbackTextareaRef.el.value,
        });
    }

    /**
     * @private
     */
    async _onClickDoneAndScheduleNext() {
        const action = await this.storeDispatch(
            'markActivityAsDoneAndScheduleNext',
            this.props.activityLocalId,
            {
                feedback: this._feedbackTextareaRef.el.value,
            }
        );
        const on_close = () => {
            this.storeDispatch('refreshChatterActivities', this.activity.chatterLocalId);
        };
        this.env.do_action(action, { on_close });
    }

}

Object.assign(ActivityMarkDonePopover, {
    props: {
        activityLocalId: String,
    },
    template: 'mail.messaging.component.ActivityMarkDonePopover',
});

return ActivityMarkDonePopover;

});
