from django.db import migrations


class Migration(migrations.Migration):
    """
    Drop the unfinished face search and what only existed for it.

    Student linked an account to a promotion, but every row pointed to the
    first promotion in the table: it carried no information. Reaction was never
    used.
    """

    dependencies = [
        ("api", "0009_unique_slug_and_files"),
    ]

    operations = [
        migrations.DeleteModel(name="Face"),
        migrations.DeleteModel(name="Reaction"),
        migrations.DeleteModel(name="Student"),
    ]
