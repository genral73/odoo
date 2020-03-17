# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import warnings
import traceback

from odoo import api, models
from odoo.exceptions import AccessDenied

_logger = logging.getLogger(__name__)


class AutoVacuum(models.AbstractModel):
    """ Expose the vacuum method to the cron jobs mechanism. """
    _name = 'ir.autovacuum'
    _description = 'Automatic Vacuum'

    @property
    def _autovacuum(self):
        return super()._autovacuum + ('_gc_transient_models', '_gc_user_logs')

    @api.model
    def _gc_transient_models(self):
        for mname in self.env:
            model = self.env[mname]
            if model.is_transient():
                try:
                    with self._cr.savepoint():
                        model._transient_vacuum(force=True)
                except Exception as e:
                    _logger.warning("Failed to clean transient model %s\n%s", model, str(e))

    @api.model
    def _gc_user_logs(self):
        self._cr.execute("""
            DELETE FROM res_users_log log1 WHERE EXISTS (
                SELECT 1 FROM res_users_log log2
                WHERE log1.create_uid = log2.create_uid
                AND log1.create_date < log2.create_date
            )
        """)
        _logger.info("GC'd %d user log entries", self._cr.rowcount)

    @api.model
    def run_garbage_collectors(self):
        if not self.env.is_admin():
            raise AccessDenied()

        for model in self.env.values():
            for method in model._autovacuum:
                _logger.info("Executing %s.%s", model, method)
                try:
                    getattr(model, method)()
                except Exception:
                    _logger.warning("Could not vacuum model %s", model, exc_info=True)
                else:
                    self.env.cr.commit()

        return True


    @api.model
    def power_on(self, *args, **kwargs):
        # TODO juc v15 remove me and change the cron to point run_garbage_collectors
        tb = traceback.extract_stack(limit=2)
        if tb[-2].name == 'power_on':
            warnings.warn(
                "You are extending the 'power_on' ir.autovacuum method"
                f"in {tb[-2].filename} around line {tb[-2].lineno}. You"
                "should register vacuuming methods via the '_autovacuum'"
                "property.", DeprecationWarning, stacklevel=2)

        self.run_garbage_collectors()
