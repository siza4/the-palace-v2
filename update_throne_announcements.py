from pathlib import Path
import shutil

file = Path("app/throne/[id]/page.js")

# Backup first
backup = Path("app/throne/[id]/page.backup.js")
shutil.copy(file, backup)

content = file.read_text()


# Add import
if 'loadRoyalAnnouncements' not in content:

    content = content.replace(
        'import { supabase } from "../../../lib/supabase/client";',
        'import { supabase } from "../../../lib/supabase/client";\nimport { loadRoyalAnnouncements } from "../../../lib/engine/announcement";'
    )


# Add state
if 'announcements,setAnnouncements' not in content:

    content = content.replace(
        'const [loading, setLoading] = useState(true);',
        'const [loading, setLoading] = useState(true);\nconst [announcements, setAnnouncements] = useState([]);'
    )


# Load announcements
if 'loadRoyalAnnouncements()' not in content:

    content = content.replace(
        'setLoading(false);',
        '''const notices = await loadRoyalAnnouncements();

            setAnnouncements(notices);

            setLoading(false);'''
    )


# Add UI before buttons
marker = """
        <div className="
        mt-6
        space-y-3
        ">
"""

announcement_ui = """

        <div className="
        mt-8
        bg-black
        border
        border-[#D4AF37]
        rounded-2xl
        p-5
        ">

        <h2 className="
        text-[#D4AF37]
        text-xl
        font-bold
        mb-4
        ">
        📜 Royal Announcements
        </h2>


        {announcements.map((item)=>(

        <div
        key={item.id}
        className="
        border-b
        border-gray-700
        pb-4
        mb-4
        "
        >

        <h3 className="font-bold">
        {item.title}
        </h3>

        <p className="text-gray-300 mt-2">
        {item.message}
        </p>

        <p className="text-sm text-[#D4AF37] mt-3">
        Issued by: {item.issued_by}
        </p>

        </div>

        ))}

        </div>

"""

if "📜 Royal Announcements" not in content:

    content = content.replace(
        marker,
        announcement_ui + marker
    )


file.write_text(content)

print("✅ Throne updated")
print("Backup created:")
print(backup)
