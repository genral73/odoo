{
    'name': "Password Policy support for Signup",
    'depends': ['auth_password_policy', 'auth_signup'],
    'category': 'Tools',
    'auto_install': True,
    'data': [
        'views/assets.xml',
        'views/signup_templates.xml',
    ],
    'exclude_from_loc_count': ['__all__'],
}
