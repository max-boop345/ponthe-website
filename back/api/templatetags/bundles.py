import os

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()


@register.simple_tag
def bundle(name):
    """
    URL of a React bundle, with the date of its last build as a query string.

    The bundles keep the same name from one build to the next, and browsers hold
    on to a script for weeks when nothing tells them otherwise: a page would be
    served new markup with last month's code. A URL that changes with each build
    gets the new file fetched.
    """
    path = f"react/{name}.bundle.js"
    found = finders.find(path)
    version = int(os.path.getmtime(found)) if found else 0
    return f"{static(path)}?v={version}"
