from api.models import File, Gallery, Promo, Year
from django.contrib import admin


class YearAdmin(admin.ModelAdmin):
    list_display = ("name",)


class GalleryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "description",
        "date",
        "visibility",
        "type",
        "year",
        "view",
    )
    ordering = ("date",)


class FileAdmin(admin.ModelAdmin):
    list_display = ("gallery", "file_full_name", "file_name", "file_extension", "link")
    ordering = ("gallery",)


class PromoAdmin(admin.ModelAdmin):
    list_display = ("name", "first_year")


# Register your models here.
admin.site.register(Year, YearAdmin)
admin.site.register(Promo, PromoAdmin)
admin.site.register(Gallery, GalleryAdmin)
admin.site.register(File, FileAdmin)
