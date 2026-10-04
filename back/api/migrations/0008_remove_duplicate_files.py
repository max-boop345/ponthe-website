from django.db import migrations


def remove_duplicate_files(apps, schema_editor):
    """
    Keep the oldest row of each (gallery, file name) pair.

    Two import tasks running on the same gallery registered every picture
    twice. The rows are identical apart from their id, and point to the same
    file on disk: nothing is lost by dropping the later ones.
    """
    File = apps.get_model("api", "File")
    seen = set()
    duplicates = []
    rows = File.objects.order_by("id").values_list("id", "gallery_id", "file_full_name")
    for pk, gallery_id, name in rows.iterator():
        if (gallery_id, name) in seen:
            duplicates.append(pk)
        else:
            seen.add((gallery_id, name))
    for start in range(0, len(duplicates), 500):
        File.objects.filter(pk__in=duplicates[start : start + 500]).delete()


class Migration(migrations.Migration):
    # On its own, ahead of 0009: PostgreSQL refuses to alter a table in the
    # transaction that deleted rows from it ("pending trigger events", from the
    # deferred foreign keys). The clean-up has to be committed first.
    dependencies = [
        ("api", "0007_gallery_view"),
    ]

    operations = [
        migrations.RunPython(remove_duplicate_files, migrations.RunPython.noop),
    ]
