"""
Generates a realistic, domain-specific labeled dataset for Computer Lab Complaints
Categories:
- Computer not starting
- Slow computer
- Network issue
- Software issue
- Keyboard issue
- Mouse issue
- Monitor issue
- Other

Features:
- description: Text complaint description
- complaint_type: Categorical complaint type
- severity: 'low', 'medium', 'high'
Target:
- priority: 'low', 'medium', 'high'
"""

import os
import random
import pandas as pd

random.seed(42)

# Templates and vocabulary for generating realistic lab issues
COMPLAINT_TEMPLATES = [
    # --- Computer not starting ---
    # High priority cases
    ("The computer is completely dead. Power button does nothing, no fan spin or lights. Burning smell noticed near PSU.", "Computer not starting", "high", "high"),
    ("CPU is not powering on at all. Sparks were seen near the power cord connector. Entire row shut off.", "Computer not starting", "high", "high"),
    ("System does not turn on. Power supply makes a loud clicking sound and shuts off immediately. Lab exam scheduled today.", "Computer not starting", "high", "high"),
    ("Computer fails to boot. Emits 5 continuous loud beeps indicating motherboard or CPU failure. Won't post BIOS.", "Computer not starting", "high", "high"),
    ("PC powers on for two seconds then immediately shuts down in a boot loop. Blue smoke seen from back fan.", "Computer not starting", "high", "high"),
    ("PC won't boot into Windows. Error: 'No bootable device found - insert boot disk and press any key'. Hard drive clicking loudly.", "Computer not starting", "high", "high"),
    ("No display and computer will not power on at all. LED light on motherboard is red.", "Computer not starting", "medium", "high"),
    # Medium priority cases
    ("Computer shuts down randomly during startup or restarts unexpectedly after 10 minutes.", "Computer not starting", "medium", "medium"),
    ("PC takes 10 to 15 tries pressing power button to start up. Suspect loose power switch.", "Computer not starting", "medium", "medium"),
    ("Computer stuck on BIOS boot splash screen with error 'CMOS battery dead, press F1 to continue'.", "Computer not starting", "medium", "medium"),
    ("System reboots repeatedly when loading Windows. Safe mode works intermittently.", "Computer not starting", "medium", "medium"),
    # Low priority cases
    ("Computer power button is stiff and needs to be pressed firmly to turn on, but it works fine once booted.", "Computer not starting", "low", "low"),
    ("Power LED light does not glow when PC is on, but system runs normally.", "Computer not starting", "low", "low"),

    # --- Slow computer ---
    # High priority cases
    ("System is completely frozen and unresponsive. Task manager shows 100% disk usage and 99% CPU on idle.", "Slow computer", "high", "high"),
    ("Computer is throttling severely due to overheating CPU reaching 95C. Shuts down during code compilation.", "Slow computer", "high", "high"),
    ("Severe system lag making it impossible to conduct practical exams. Takes 25 minutes just to load desktop.", "Slow computer", "high", "high"),
    # Medium priority cases
    ("PC runs sluggishly when opening IDEs like Android Studio or VS Code. Takes 5 minutes to launch.", "Slow computer", "medium", "medium"),
    ("System experiences noticeable lag and delay when running multiple browser tabs and Python scripts.", "Slow computer", "medium", "medium"),
    ("Computer is slower than usual after recent Windows update. Takes longer to boot up in the morning.", "Slow computer", "medium", "medium"),
    ("High RAM usage causing minor freezes during Java programming sessions.", "Slow computer", "medium", "medium"),
    ("Antivirus background scan causes intermittent slowdowns during afternoon lab sessions.", "Slow computer", "medium", "medium"),
    # Low priority cases
    ("Slight delay when opening file explorer, but normal software operates smoothly.", "Slow computer", "low", "low"),
    ("Takes around 30 seconds extra to boot up compared to neighboring computers, but works fine once loaded.", "Slow computer", "low", "low"),
    ("Computer feels slightly sluggish after being on for 8 hours. Restart temporarily fixes it.", "Slow computer", "low", "low"),

    # --- Network issue ---
    # High priority cases
    ("Entire lab network switch is down. No PC in row A has ethernet internet connectivity. Online exam in 30 mins.", "Network issue", "high", "high"),
    ("Ethernet port on motherboard appears dead. No link lights, cannot connect to college intranet or gateway.", "Network issue", "high", "high"),
    ("Cannot reach database server or internet. DNS lookup failing across all systems in Lab B.", "Network issue", "high", "high"),
    ("Network cable RJ45 clip broken and port pins bent, completely disconnected from lab LAN.", "Network issue", "high", "high"),
    # Medium priority cases
    ("Frequent network disconnections every 10 minutes interrupting student file downloads.", "Network issue", "medium", "medium"),
    ("Very low internet bandwidth and high ping packet loss on this workstation compared to other PCs.", "Network issue", "medium", "medium"),
    ("Cannot access the local file share server, though external web browsing works fine.", "Network issue", "medium", "medium"),
    ("Network speed drops to 10 Mbps instead of 1 Gbps due to bad patch cord.", "Network issue", "medium", "medium"),
    # Low priority cases
    ("Occasional lag spike when accessing remote repository on GitHub, but local network is stable.", "Network issue", "low", "low"),
    ("Network connection icon shows a yellow warning triangle for 5 seconds on startup then resolves itself.", "Network issue", "low", "low"),
    ("Ethernet cable jacket is slightly frayed near the wall jack, but network connection is fully functional.", "Network issue", "low", "low"),

    # --- Software issue ---
    # High priority cases
    ("Operating system blue screen of death (BSOD) with error CRITICAL_PROCESS_DIED immediately after login.", "Software issue", "high", "high"),
    ("Ransomware or virus alert pop-up detected on screen. File extensions are being modified. Urgent isolation required.", "Software issue", "high", "high"),
    ("Crucial lab exam software (Safe Exam Browser / Oracle Client) crashes on launch with missing DLL error.", "Software issue", "high", "high"),
    ("Corrupted registry causing system to fail during user profile service load.", "Software issue", "high", "high"),
    # Medium priority cases
    ("Python compiler and GCC not installed or PATH variable missing for student accounts.", "Software issue", "medium", "medium"),
    ("MATLAB license expired and throws licensing error 9 on startup. Students need it for tomorrow's lab.", "Software issue", "medium", "medium"),
    ("Google Chrome crashes when attempting to open college portal; Firefox works as temporary workaround.", "Software issue", "medium", "medium"),
    ("VS Code extensions cannot be installed due to permission restrictions in student profile directory.", "Software issue", "medium", "medium"),
    ("Git command line tool throws SSL certificate validation failed when cloning repositories.", "Software issue", "medium", "medium"),
    # Low priority cases
    ("VLC media player needs update to latest version, minor prompt appears.", "Software issue", "low", "low"),
    ("Desktop shortcut icon for Dev-C++ is missing, but program opens from start menu.", "Software issue", "low", "low"),
    ("Dark mode setting resets to default light mode upon logging out.", "Software issue", "low", "low"),
    ("Spell check dictionary in LibreOffice writer shows red underline on technical jargon.", "Software issue", "low", "low"),

    # --- Keyboard issue ---
    # High priority cases
    ("Entire keyboard is completely dead and unrecognized by BIOS. USB ports fail to detect any input device.", "Keyboard issue", "high", "high"),
    ("Multiple essential keys stuck down (Enter, Ctrl, Shift) preventing user from typing password to login.", "Keyboard issue", "medium", "high"),
    # Medium priority cases
    ("Spacebar and Enter key do not register unless pressed very hard. Hinders coding lab work.", "Keyboard issue", "medium", "medium"),
    ("Several keys (A, S, D, Backspace) are malfunctioning and repeating random characters.", "Keyboard issue", "medium", "medium"),
    ("Number pad keys on the right side do not work even when NumLock is turned on.", "Keyboard issue", "medium", "medium"),
    ("Spilled water on keyboard earlier today. Keys feel sticky and several letters produce incorrect symbols.", "Keyboard issue", "medium", "medium"),
    # Low priority cases
    ("Letter key cap 'E' has worn off paint, but key types normally.", "Keyboard issue", "low", "low"),
    ("Keyboard tilt feet / stand on the underside is broken, sits flat on desk.", "Keyboard issue", "low", "low"),
    ("Keyboard USB cable is a bit short and stretched across desk, but works reliably.", "Keyboard issue", "low", "low"),
    ("Caps Lock indicator LED does not light up, but uppercase switching works.", "Keyboard issue", "low", "low"),

    # --- Mouse issue ---
    # High priority cases
    ("Mouse not detected at all, optical sensor laser is completely off, cannot navigate Windows.", "Mouse issue", "medium", "medium"),
    ("Mouse left click button is permanently stuck down, registering non-stop double clicks and dragging windows uncontrollably.", "Mouse issue", "medium", "medium"),
    # Medium priority cases
    ("Mouse cursor jumps erratically across screen or freezes every few seconds during GUI design work.", "Mouse issue", "medium", "medium"),
    ("Mouse scroll wheel is broken and spins freely without scrolling documents or code files.", "Mouse issue", "medium", "medium"),
    ("Right click button does not respond, preventing context menu usage in programming tools.", "Mouse issue", "medium", "medium"),
    # Low priority cases
    ("Mouse pad is worn out and dirty, causing slight friction when sliding.", "Mouse issue", "low", "low"),
    ("Mouse scroll wheel squeaks slightly when scrolled quickly, but operates properly.", "Mouse issue", "low", "low"),
    ("Rubber coating on mouse side grip is peeling off, purely cosmetic.", "Mouse issue", "low", "low"),

    # --- Monitor issue ---
    # High priority cases
    ("Monitor screen remains completely pitch black. Power LED blinks amber, no signal detected on HDMI or DisplayPort.", "Monitor issue", "high", "high"),
    ("Monitor emits a loud high-pitched whining noise and displays smoke/sparks from back vent.", "Monitor issue", "high", "high"),
    ("Screen is shattered with visible internal LCD crack and liquid bleed across 80% of display.", "Monitor issue", "high", "high"),
    ("Display shows severe red and green vertical glitch lines covering whole screen, unreadable text.", "Monitor issue", "high", "high"),
    # Medium priority cases
    ("Monitor flickers rapidly every few seconds causing severe eye strain to students.", "Monitor issue", "medium", "medium"),
    ("Screen has a strong yellow tint / color discoloration due to loose VGA/HDMI cable pin.", "Monitor issue", "medium", "medium"),
    ("Display resolution is locked at 640x480 and native 1080p option is disabled in display settings.", "Monitor issue", "medium", "medium"),
    ("Monitor power turns off automatically every 20 minutes and must be manually toggled back on.", "Monitor issue", "medium", "medium"),
    # Low priority cases
    ("Monitor bezel has a small plastic scratch on the outer plastic border.", "Monitor issue", "low", "low"),
    ("Single stuck dead pixel in bottom right corner of display, barely noticeable.", "Monitor issue", "low", "low"),
    ("Monitor stand height adjustment screw is tight and hard to swivel.", "Monitor issue", "low", "low"),
    ("Power indicator LED on monitor blinks blue instead of solid green.", "Monitor issue", "low", "low"),

    # --- Other / Environmental / Peripheral ---
    ("Lab air conditioning unit leaking water directly onto PC rack. Water dripping near power sockets.", "Other", "high", "high"),
    ("Headphone jack on front panel is broken with a bent audio pin snapped inside the port.", "Other", "low", "low"),
    ("UPS backup battery not holding charge; PC immediately loses power during momentary voltage fluctuations.", "Other", "high", "high"),
    ("CMOS time clock resets to year 2000 on every restart.", "Other", "low", "low"),
    ("External USB ports on the front panel are loose and disconnect USB flash drives when touched.", "Other", "medium", "medium"),
    ("Projector in Lab A won't connect to lecturer workstation PC for class presentation.", "Other", "high", "high"),
]

# Variations and perturbations to generate 350+ realistic training records
VARIATION_PREFIXES = [
    "",
    "Student reported: ",
    "Faculty notice: ",
    "During morning lab session, ",
    "Urgent report: ",
    "Please check PC: ",
    "Lab assistant noted that ",
    "During operating systems practical: ",
    "In Lab 2 row 4, ",
    "Observed issue: ",
]

VARIATION_SUFFIXES = [
    "",
    " Needs technician review.",
    " Kindly resolve before the next lab class.",
    " Student had to swap to a different workstation.",
    " Happening repeatedly today.",
    " Please fix as soon as possible.",
    " Reported during practical hours.",
    " Inspection required.",
]


def generate_dataset(target_count=360):
    rows = []
    
    # 1. First include all distinct base templates
    for desc, ctype, sev, prio in COMPLAINT_TEMPLATES:
        rows.append({
            "description": desc,
            "complaint_type": ctype,
            "severity": sev,
            "priority": prio
        })
    
    # 2. Generate augmented variations with realistic phrasing
    while len(rows) < target_count:
        base_desc, ctype, sev, prio = random.choice(COMPLAINT_TEMPLATES)
        prefix = random.choice(VARIATION_PREFIXES)
        suffix = random.choice(VARIATION_SUFFIXES)
        
        # Realistic discrepancies where student severity differs from actual priority:
        # 1. Urgent text keywords that escalate priority regardless of user severity
        urgent_keywords = ["smoke", "spark", "burning", "spill", "water", "exam", "bsod", "ransomware", "virus", "dead", "fire", "shattered", "leak"]
        minor_keywords = ["scratch", "bezel", "sticker", "dirty", "paint", "squeak", "dark mode", "feet", "stand", "led"]

        desc_lower = base_desc.lower()
        if any(w in desc_lower for w in urgent_keywords):
            # Critical issue described in text
            final_prio = "high"
            # 30% of time, student marked it merely 'medium'
            if random.random() < 0.30:
                final_sev = "medium"
        elif any(w in desc_lower for w in minor_keywords):
            # Minor cosmetic/peripheral issue described in text
            final_prio = "low"
            # 25% of time, student marked it 'medium' or 'high' out of annoyance
            if random.random() < 0.25:
                final_sev = "medium"
        else:
            final_sev = sev
            final_prio = prio
            if random.random() < 0.15:
                # Moderate variation
                if sev == "high" and random.random() < 0.3:
                    final_sev = "medium"
                elif sev == "low" and random.random() < 0.3:
                    final_sev = "medium"

        varied_text = f"{prefix}{base_desc}{suffix}".strip()
        rows.append({
            "description": varied_text,
            "complaint_type": ctype,
            "severity": final_sev,
            "priority": final_prio
        })

    df = pd.DataFrame(rows)
    # Shuffle
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "complaints_dataset.csv")

    df = generate_dataset(target_count=400)
    df.to_csv(out_file, index=False)
    print(f"Generated {len(df)} labeled complaints in {out_file}")
    print("\nPriority distribution:")
    print(df["priority"].value_counts())
    print("\nComplaint type distribution:")
    print(df["complaint_type"].value_counts())
    print("\nSeverity distribution:")
    print(df["severity"].value_counts())
