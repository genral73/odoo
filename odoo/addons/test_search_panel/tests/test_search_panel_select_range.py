# -*- coding: utf-8 -*-
import odoo.tests


@odoo.tests.tagged('post_install', '-at_install')
class TestSelectRange(odoo.tests.TransactionCase):

    def setUp(self):
        super().setUp()
        self.SourceModel = self.env['test_search_panel.source_model']
        self.TargetModel = self.env['test_search_panel.category_target_model']
        self.TargetModelNoParentName = self.env['test_search_panel.category_target_model_no_parent_name']

    # Many2one

    def test_many2one_empty(self):
        result = self.SourceModel.search_panel_select_range('folder_id')
        self.assertEqual(
            result,
            {
                'parent_field': 'parent_id',
                'values': [],
            }
        )

    def test_many2one(self):
        parent_folders = self.TargetModel.create([
            {'name': 'Folder 1', },
            {'name': 'Folder 2', },
        ])

        f1_id, f2_id = parent_folders.ids

        children_folders = self.TargetModel.create([
            {'name': 'Folder 3', 'parent_id': f1_id, },
            {'name': 'Folder 4', 'parent_id': f2_id, },
        ])

        f3_id, f4_id = children_folders.ids

        records = self.SourceModel.create([
            {'name': 'Rec 1', 'folder_id': f1_id, },
            {'name': 'Rec 2', 'folder_id': f3_id, },
            {'name': 'Rec 3', 'folder_id': f4_id, },
            {'name': 'Rec 4', },
        ])

        r1_id, _, r3_id, _ = records.ids

        # counters
        result = self.SourceModel.search_panel_select_range('folder_id')
        self.assertEqual(
            result['values'],
            [
                {'count': 2, 'display_name': 'Folder 1', 'id': f1_id, },
                {'count': 1, 'display_name': 'Folder 2', 'id': f2_id, },
                {'count': 1, 'display_name': 'Folder 3',
                    'id': f3_id, 'parent_id': f1_id, },
                {'count': 1, 'display_name': 'Folder 4',
                    'id': f4_id, 'parent_id': f2_id, },
            ]
        )

        # counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'folder_id',
            search_domain=[['id', 'in', [r1_id, r3_id]]],
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 1, 'display_name': 'Folder 1', 'id': f1_id, },
                {'count': 1, 'display_name': 'Folder 2', 'id': f2_id, },
                {'count': 0, 'display_name': 'Folder 3',
                    'id': f3_id, 'parent_id': f1_id, },
                {'count': 1, 'display_name': 'Folder 4',
                    'id': f4_id, 'parent_id': f2_id, },
            ]
        )

        # no counters
        result = self.SourceModel.search_panel_select_range(
            'folder_id',
            disable_counters=True,
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Folder 1', 'id': f1_id, },
                {'count': 0, 'display_name': 'Folder 2', 'id': f2_id, },
                {'count': 0, 'display_name': 'Folder 3',
                    'id': f3_id, 'parent_id': f1_id, },
                {'count': 0, 'display_name': 'Folder 4',
                    'id': f4_id, 'parent_id': f2_id, },
            ]
        )

        # no counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'folder_id',
            disable_counters=True,
            search_domain=[['id', 'in', [r1_id, r3_id]]],
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Folder 1', 'id': f1_id, },
                {'count': 0, 'display_name': 'Folder 2', 'id': f2_id, },
                {'count': 0, 'display_name': 'Folder 3',
                    'id': f3_id, 'parent_id': f1_id, },
                {'count': 0, 'display_name': 'Folder 4',
                    'id': f4_id, 'parent_id': f2_id, },
            ]
        )

    # Many2one no parent name

    def test_many2one_empty_no_parent_name(self):
        result = self.SourceModel.search_panel_select_range('categ_id')
        self.assertEqual(
            result,
            {
                'parent_field': False,
                'values': [],
            }
        )

    def test_many2one_no_parent_name(self):
        categories = self.TargetModelNoParentName.create([
            {'name': 'Cat 1'},
            {'name': 'Cat 2'},
            {'name': 'Cat 3'},
        ])

        c1_id, c2_id, c3_id = categories.ids

        records = self.SourceModel.create([
            {'name': 'Rec 1', 'categ_id': c1_id, },
            {'name': 'Rec 2', 'categ_id': c2_id, },
            {'name': 'Rec 3', 'categ_id': c2_id, },
            {'name': 'Rec 4', },
        ])

        r1_id, _, r3_id, _ = records.ids

        # counters
        result = self.SourceModel.search_panel_select_range('categ_id')
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Cat 3', 'id': c3_id, },
                {'count': 2, 'display_name': 'Cat 2', 'id': c2_id, },
                {'count': 1, 'display_name': 'Cat 1', 'id': c1_id, },
            ]
        )

        # counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'categ_id',
            search_domain=[['id', 'in', [r1_id, r3_id]]],
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Cat 3', 'id': c3_id, },
                {'count': 1, 'display_name': 'Cat 2', 'id': c2_id, },
                {'count': 1, 'display_name': 'Cat 1', 'id': c1_id, },
            ]
        )

        # no counters
        result = self.SourceModel.search_panel_select_range(
            'categ_id',
            disable_counters=True,
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Cat 3', 'id': c3_id, },
                {'count': 0, 'display_name': 'Cat 2', 'id': c2_id, },
                {'count': 0, 'display_name': 'Cat 1', 'id': c1_id, },
            ]
        )

        # no counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'categ_id',
            disable_counters=True,
            search_domain=[['id', 'in', [r1_id, r3_id]]],
        )
        self.assertEqual(
            result['values'],
            [
                {'count': 0, 'display_name': 'Cat 3', 'id': c3_id, },
                {'count': 0, 'display_name': 'Cat 2', 'id': c2_id, },
                {'count': 0, 'display_name': 'Cat 1', 'id': c1_id, },
            ]
        )

    # Selection case

    def test_selection_empty(self):
        result = self.SourceModel.search_panel_select_range('state')
        self.assertEqual(
            result,
            {
                'values': [
                    {'display_name': 'A', 'id': 'a', 'count': 0, },
                    {'display_name': 'B', 'id': 'b', 'count': 0, },
                ]
            }
        )

    def test_selection(self):
        records = self.SourceModel.create([
            {'name': 'Rec 1', 'state': 'a', },
            {'name': 'Rec 2', 'state': 'a', },
        ])

        r1_id, _ = records.ids

        # counters
        result = self.SourceModel.search_panel_select_range('state')
        self.assertEqual(
            result,
            {
                'values': [
                    {'display_name': 'A', 'id': 'a', 'count': 2, },
                    {'display_name': 'B', 'id': 'b', 'count': 0, },
                ]
            }
        )

        # no counters
        result = self.SourceModel.search_panel_select_range(
            'state',
            disable_counters=True,
        )
        self.assertEqual(
            result,
            {
                'values': [
                    {'display_name': 'A', 'id': 'a', 'count': 0, },
                    {'display_name': 'B', 'id': 'b', 'count': 0, },
                ]
            }
        )

        # counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'state',
            search_domain=[['id', '=', r1_id]],
        )
        self.assertEqual(
            result,
            {
                'values': [
                    {'display_name': 'A', 'id': 'a', 'count': 1, },
                    {'display_name': 'B', 'id': 'b', 'count': 0, },
                ]
            }
        )

        # no counters and search domain
        result = self.SourceModel.search_panel_select_range(
            'state',
            disable_counters=True,
            search_domain=[['id', '=', r1_id]],
        )
        self.assertEqual(
            result,
            {
                'values': [
                    {'display_name': 'A', 'id': 'a', 'count': 0, },
                    {'display_name': 'B', 'id': 'b', 'count': 0, },
                ]
            }
        )
