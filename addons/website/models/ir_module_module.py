# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models

class IrModuleModule(models.Model):
    _inherit = "ir.module.module"

    def _update_translations(self, filter_lang=None):
        """ Add missing website specific translation """
        res = super(IrModuleModule, self)._update_translations(filter_lang=filter_lang)

        if not filter_lang:
            langs = self.env['res.lang'].get_installed()
            langs = tuple(code for code, _ in langs)
        elif isinstance(filter_lang, (list, tuple)):
            langs = tuple(filter_lang)
        else:
            langs = tuple([filter_lang])
        modules = self.filtered(lambda r: r.state in ('installed', 'to install', 'to upgrade'))
        modules = tuple(set(modules.mapped('name') + modules.mapped('dependencies_id.name')))
        default_menu = self.env.ref('website.main_menu', raise_if_not_found=False)

        if not default_menu or not langs or not modules:
            return res

        if self.env.context.get('overwrite'):
            conflict_clause = """
                   ON CONFLICT (type, lang, name, res_id) WHERE type = 'model'
                   DO UPDATE SET (name, lang, res_id, src, type, value, module, state, comments) =
                       (EXCLUDED.name, EXCLUDED.lang, EXCLUDED.res_id, EXCLUDED.src, EXCLUDED.type,
                        EXCLUDED.value, EXCLUDED.module, EXCLUDED.state, EXCLUDED.comments)
                WHERE EXCLUDED.value IS NOT NULL AND EXCLUDED.value != ''
            """;
        else:
            conflict_clause = " ON CONFLICT DO NOTHING"

        # Add specific menu translations
        self.env.cr.execute("""
            INSERT INTO ir_translation(name, lang, res_id, src, type, value, module, state, comments)
            SELECT DISTINCT ON (s_menu.id, t.lang) t.name, t.lang, s_menu.id, t.src, t.type, t.value, t.module, t.state, t.comments
              FROM ir_translation t
             INNER JOIN website_menu o_menu
                ON t.type = 'model' AND t.name = 'website.menu,name' AND t.res_id = o_menu.id
             INNER JOIN website_menu s_menu
                ON o_menu.name = s_menu.name AND o_menu.url = s_menu.url
             INNER JOIN website_menu r_menu
                ON s_menu.parent_id = r_menu.id AND r_menu.parent_id IS NULL
             WHERE t.lang IN %s and t.module IN %s
               AND o_menu.website_id IS NULL AND o_menu.parent_id = %s
               AND s_menu.website_id IS NOT NULL""" + conflict_clause,
            (langs, tuple(modules), default_menu.id))

        return res
