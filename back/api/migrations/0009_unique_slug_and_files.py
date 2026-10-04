import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_remove_duplicate_files"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gallery",
            name="slug",
            field=models.SlugField(default="", max_length=1000, unique=True),
        ),
        migrations.AlterField(
            model_name="gallery",
            name="date",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddConstraint(
            model_name="file",
            constraint=models.UniqueConstraint(
                fields=("gallery", "file_full_name"), name="unique_file_per_gallery"
            ),
        ),
    ]
