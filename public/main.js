Vue.createApp({
    data() {
        return {
            view: 'patients',// can be 'patients', 'medicines, or 'administration'
            patients: [],
            locations: [],
            medicines: [],
            prescriptions: [],
            generalPrescriptions: [],
            generalMedicines: [],
            currentPatientPrescriptions: [],
            currentPatientMedicines: [],
            currentPatientPrescriptions_8oclock: [],
            currentPatientMedicines_8oclock: [],
            currentPatientPrescriptions_noTime: [],
            currentPatientMedicines_noTime: [],
            currentPatientMedicines_noTime_and_general: [],
            currentPatientId: 'P1',
            topListSortBy: { heading: 'Namn', revAlpha: false }, //revAlpha = reverse Alphabetical
            bottomListSortBy: { heading: 'Namn', revAlpha: false },
            overviewListSortBy: { heading: 'Namn', revAlpha: false },
            hasAnsweredConfirmDialogue: false,
            confirmDialogueResult: false,
            firstTabSelected: true,
            g_expanded: false,
            note_expanded: false,
            preparation_expanded: false,
            noteEdited: false,
            selectedRow: null,
            rightClickedRow: null,
            scanSound: new Audio('./assets/sound/sound.wav'),
        }
    },
    async mounted() {
        await fetch('./assets/data/Läkemedel.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.medicines = results.data;
                    },
                    header: true
                });
            })
        await fetch('./assets/data/Ordinationer.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.prescriptions = results.data;
                    },
                    header: true
                });
            })
        await fetch('./assets/data/Generella_ordinationer.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.generalPrescriptions = results.data;
                    },
                    header: true
                });
            })
    
        await fetch('./assets/data/Platser.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.locations = results.data;
                    },
                    header: true
                });
            })
        await fetch('./assets/data/Patienter.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.patients = results.data;
                    },
                    header: true
                });
            })
        this.updateBackground();
        var self = this;
        Mousetrap.bind('ctrl+a', function (e) { self.scanMedicine(e, false, 'L3') });
        Mousetrap.bind('ctrl+m', function (e) { self.scanMedicine(e, true, 'O20') });
        Mousetrap.bind('ctrl+e', function (e) { self.scanMedicine(e, true, 'O4') });
        Mousetrap.bind('ctrl+v', function (e) { self.scanMedicine(e, false, 'L23') });
    },
    methods: {
        debug(){
            console.log('Debugging')
        },
        selectPatient(){
            for (const prescription of this.prescriptions) {
                if (prescription['PatientId'] == this.currentPatientId) {
                    this.currentPatientPrescriptions.push(prescription);
                    let medicineId = prescription['LäkemedelsId']
                    for (const medicine of this.medicines) {
                        if (medicine['LäkemedelsId'] == medicineId) {
                            let medicineCopy = this.addCustomProperties(medicine, prescription);
                            this.currentPatientMedicines.push(medicineCopy);
                            if (prescription['Aktuell kl 08:00'] == '1') {
                                this.currentPatientMedicines_8oclock.push(medicineCopy);
                                this.currentPatientPrescriptions_8oclock.push(prescription);
                            }
                            else if (prescription['Vid behov'] == '1' || prescription['Ej tidssatta'] == '1') {
                                this.currentPatientMedicines_noTime.push(medicineCopy);
                                this.currentPatientPrescriptions_noTime.push(prescription);
                            }
                            break;
                        }
                    }
                }
            }
            for (const prescription of this.generalPrescriptions) {
                const medicineId = prescription['LäkemedelsId']
                for (const medicine of this.medicines) {
                    if (medicine['LäkemedelsId'] == medicineId) {
                        let medicineCopy = this.addCustomProperties(medicine, prescription);
                        this.generalMedicines.push(medicineCopy);
                    }
                }
            }
            this.currentPatientMedicines_noTime_and_general = this.currentPatientMedicines_noTime.concat(this.generalMedicines);
            this.sortMedicines(this.currentPatientMedicines_8oclock, 'Namn', { heading: '', revAlpha: false });
            this.sortMedicines(this.currentPatientMedicines_noTime_and_general, 'Namn', { heading: '', revAlpha: false });
            this.sortMedicines(this.currentPatientMedicines, 'Namn', { heading: '', revAlpha: false });
            this.updateBackground();
        },
        updateBackground(){
            if (this.view == 'patients') {
                document.getElementsByClassName('outerDiv')[0].style.backgroundImage = '';
                document.getElementsByClassName('outerDiv')[0].style.backgroundColor = 'rgb(230, 230, 230)'
            }
            else{
                document.getElementsByClassName('outerDiv')[0].style.backgroundImage = `url(assets/images/${this.currentPatientId}.png)`;
            }
        },
        selectRow(row, userClickedRow) {
            if (this.modalWindowIsUp) { return }
            if (this.isSelectedRow(row) && userClickedRow) {
                this.selectedRow = null;
            }
            else {
                this.selectedRow = row;
            }
        },
        isSelectedRow(row) {
            return this.selectedRow == row;
        },
        addCustomProperties(medicine, prescription) {
            let medicineCopy = JSON.parse(JSON.stringify(medicine));
            medicineCopy['Läkemedel valt'] = medicineCopy['Leveranstyp'] <= '2';
            medicineCopy['Övrigt'] = '';
            medicineCopy['Info'] = '';
            medicineCopy['Info Långform'] = '';
            medicineCopy['Anteckning'] = '';
            medicineCopy['Tid'] = '';
            medicineCopy['Iordningställt läkemedel'] = '';
            medicineCopy['Mängd'] = '';
            medicineCopy['Beredningsform_edited'] = '';
            medicineCopy['Batchnummer'] = '';
            medicineCopy['Form'] = '';
            medicineCopy['Dos'] = '';
            medicineCopy['Kommentar'] = '';
            medicineCopy.prescription = prescription;
            medicineCopy['G'] = '';
            
            if (medicineCopy.prescription['Pausad'] ==  '1') {
                medicineCopy['Info'] = 'Pausad'
            }
            else if (medicineCopy['Läkemedel valt']) {
                if(prescription['Har utbyte skett'] == '1'){
                    medicineCopy['G'] = 'G';
                    medicineCopy['Info'] = this.getReplacingMedicines(medicineCopy)[0]['Namn']
                }
            }
            else if (this.getPlaces_sorted(medicine)[0]?.['PlatsId'] == 'PL1') {
                medicineCopy['Info'] = 'Finns';
                medicineCopy['Info Långform'] = 'Finns';
            }
            else {
                if (medicineCopy['Kan bytas mot'] != '') {
                    medicineCopy['G'] = 'g';
                    for (const replMed of this.getReplacingMedicines(medicineCopy)) {
                        if (this.getPlaces_sorted(replMed)[0]?.['PlatsId'] == 'PL1') {
                            medicineCopy['Info'] = 'Utbyte finns';
                            medicineCopy['Info Långform'] = 'Utbyte finns';
                            return medicineCopy;
                        }
                    }
                }
                let locationNames = [];
                let locationNamesLong = [];
                this.getPlaces_sorted(medicineCopy).every((location) => {
                    locationNames.push(location['Kortnamn']);
                    locationNamesLong.push(location['Namn']);
                });
                medicineCopy['Info'] = locationNames.join(', ');
                medicineCopy['Info Långform'] = locationNamesLong.join(', ');
                if (medicineCopy['Info'] == '') {
                    medicineCopy['Info'] = 'Saknas';
                    medicineCopy['Info Långform'] = 'Saknas';                        
                }
            }

            return medicineCopy;
        },
        getReplacingMedicines(medicine) {
            let result = [];
            for (const medicineID of medicine['Kan bytas mot'].split(', ')) {
                for (const med of this.medicines) {
                    if (medicineID == med['LäkemedelsId']) {
                        result.push(med);
                        break;
                    }
                }
            }
            return result;
        },
        sortMedicines(medicines, sortBy, previousState){
            if (previousState.heading == sortBy) {
                medicines.reverse();
                previousState.revAlpha = !previousState.revAlpha;
            }
            else{
                medicines.sort((a, b) => a[sortBy]?.localeCompare(b[sortBy]))
                previousState.heading = sortBy;
                previousState.revAlpha = false;
            }
        },
        getPlaces_sorted(medicine){
            let result = [];
            for (const locationID of medicine['Finns på'].split(', ')){
                for (const location of this.locations) {
                    if (locationID == location['PlatsId']){
                        result.push(location)
                    }
                }
            }
            let result_sorted = [];
            for (const locationDistance of ['1', '2', '3']) {
                for (const location of result) {
                    if (locationDistance == location['Gångavstånd till testavdelning']) {
                        result_sorted.push(location)
                    }
                }
            }
            return result_sorted;
        },
        tab_click() {
            if (this.modalWindowIsUp) { return }
            this.firstTabSelected = !this.firstTabSelected;
            this.selectedRow = null;
        },
        G_click() {
            if (this.modalWindowIsUp && !this.g_expanded) { return }
            this.g_expanded = !this.g_expanded;
        },
        note_click() {
            if (this.modalWindowIsUp && !this.note_expanded) { return }
            this.note_expanded = !this.note_expanded;
        },
        preparation_click() {
            if (this.modalWindowIsUp && !this.preparation_expanded) { return }
            this.preparation_expanded = !this.preparation_expanded;
        },
        rightClick(event, row) {
            if (this.modalWindowIsUp) { return }
            this.rightClickedRow = row;
            this.selectedRow = row;
            if (document.getElementById("contextMenu").style.display == "block") {
                this.hideMenu();
            }
            var menu = document.getElementById("contextMenu")
            menu.style.display = 'block';
            menu.style.left = (event.pageX + 1) + "px";
            menu.style.top = event.pageY + "px";
            
        },
        hideMenu() {
            document.getElementById("contextMenu").style.display = "none";
            this.rightClickedRow = null;
        },
        saveNote() {
            this.selectedRow['Anteckning'] = document.getElementById('note_editable').innerText;
            this.closeNote();
        },
        closeNote() {
            this.noteEdited = false;
            this.note_expanded = false;
        },
        closePreparation() {
            this.preparation_expanded = false;
        },
        savePreparation() {
            this.selectedRow['Övrigt'] = this.selectedRow['Övrigt'] == 'Scannar' ? 'Scannat' :'Iordningställd'
            if (document.getElementById('preparedMedication_editable')?.innerText == this.selectedRow['Namn']) {
                this.selectedRow['G'] = '';
                this.selectedRow['Info'] = '';
                this.selectedRow['Utbytt läkemedel'] = this.selectedRow['Namn'];
            }
            else if (document.getElementById('preparedMedication_dropdown')){
                this.selectedRow['G'] = 'G';
                this.selectedRow['Info'] = document.getElementById('').value;
                this.selectedRow['Utbytt läkemedel'] = document.getElementById('preparedMedication_dropdown').innerText;
            }
            else{
                this.selectedRow['G'] = 'G';
                this.selectedRow['Info'] = document.getElementById('preparedMedication_editable').value;
                this.selectedRow['Utbytt läkemedel'] = document.getElementById('preparedMedication_editable').innerText;
            }
            this.selectedRow['Aut'] = '0';
            this.selectedRow['Kyl'] = '0';
            this.selectedRow['Tid'] = document.getElementById('time_editable').innerText;
            this.selectedRow['Iordningställt läkemedel'] = document.getElementById('preparedMedication_editable')?.innerText ?? document.getElementById('preparedMedication_dropdown').value;
            this.selectedRow['Mängd'] = document.getElementById('amount_editable').innerText;
            this.selectedRow['Beredningsform_edited'] = document.getElementById('form_editable').innerText;
            this.selectedRow['Batchnummer'] = document.getElementById('batchNumber_editable').innerText;
            this.selectedRow['Form'] = document.getElementById('form_editable').innerText;
            this.selectedRow['Dos'] = document.getElementById('dose_editable').innerText;
            this.selectedRow['Kommentar'] = document.getElementById('comment_editable').innerText;
            if (this.selectedRow.prescription?.['Aktuell kl 08:00'] != '1' && !this.currentPatientMedicines_noTime_and_general.includes(this.selectedRow)) {
                this.currentPatientMedicines_8oclock.push(this.selectedRow);
                this.sortMedicines(this.currentPatientMedicines_8oclock, this.topListSortBy.heading, { heading: '', revAlpha:false });
            }
            this.closePreparation();
        },
        async confirmDialogue(questionText, confirmText, cancelText) {
            this.hasAnsweredConfirmDialogue = false;
            document.getElementById('confirmDialogue_question').innerText = questionText;
            document.getElementById('confirmDialogue_confirm').innerText = confirmText;
            document.getElementById('confirmDialogue_cancel').innerText = cancelText;
            document.getElementById('confirmDialogue').style.display = 'flex';
            while (!this.hasAnsweredConfirmDialogue) {
                await new Promise(res => setTimeout(res, 200))
            }
            document.getElementById('confirmDialogue').style.display = 'none';
        },
        async errorDialogue(errorText) {
            document.getElementById('confirmDialogue_confirm').classList.add('invisible');
            await this.confirmDialogue(errorText, '', 'Stäng');
            document.getElementById('confirmDialogue_confirm').classList.remove('invisible');
        },
        async scanMedicine(event, oneDose, medIdOrPrescId){
            event.preventDefault();
            this.g_expanded = false;
            this.scanSound.play();
            if (this.view == 'administration') {
                if (this.allMedicines.filter((med) => ((med['Övrigt'] == 'Iordningställd' || med['Övrigt'] == 'Scannat' || med['Övrigt'] == 'klar') && (med.prescription['OrdinationsId'] == medIdOrPrescId || med['LäkemedelsId'] == medIdOrPrescId))).length == 0) {
                    await this.errorDialogue(`Detta läkemedel ej iordningställt. Gå tillbaka till iordningsställande om du vill lägga till det.`);
                    return
                }
                if (oneDose) {
                    const currentMedicine = this.allMedicines.filter(medicine => medicine.prescription['OrdinationsId'] == medIdOrPrescId)[0];
                    currentMedicine['Övrigt'] = 'klar';
                    this.selectRow(currentMedicine, false);
                }
                else {
                    await this.errorDialogue(`Detta läkemedel är inte dosförpackat. Ange att ordinationen är klar att administrera genom att ange detta via knapp i detaljvyn eller via högerklicksmeny`);
                    const currentMedicine = this.allMedicines.filter(medicine => medicine['LäkemedelsId'] == medIdOrPrescId)[0];
                    this.selectRow(currentMedicine, false);
                }
            }
            else if (this.view == 'medicines') {
                if (this.allMedicines.filter(med => med.prescription['OrdinationsId'] == medIdOrPrescId).length == 0 && this.allMedicines.filter(med => med['LäkemedelsId'] == medIdOrPrescId).length == 0) {
                    await this.confirmDialogue(`Detta läkemedel ej ordinerat för patienten. Vill du avbryta iordningsställandet eller fortsätta ändå?`, 'Avbryt', 'Fortsätt');
                    if (!this.confirmDialogueResult) {
                        await this.errorDialogue('Denna funktion inte implementerad i prototypen'); 
                    }
                    return
                }
                if (this.note_expanded) {
                    await this.confirmDialogue('Avbryt anteckning?', 'Ja, avbryt', 'Nej, fortsätt');
                    if (this.confirmDialogueResult) { this.closeNote() }
                    else{ return }
                }
                if (this.preparation_expanded && this.selectedRow?.['LäkemedelsId'] != medIdOrPrescId && this.selectedRow?.prescription['OrdinationsId'] != medIdOrPrescId){
                    await this.confirmDialogue(`Du har skannat ${
                        this.allMedicines.filter(med => med['LäkemedelsId'] == medIdOrPrescId || med.prescription['OrdinationsId'] == medIdOrPrescId)[0]['Namn']
                    }.Vill du avbryta iordningställandet av ${this.selectedRow?.['Namn']}'?`, 'Ja, avbryt', 'Nej, fortsätt');
                    if (this.confirmDialogueResult) { this.closePreparation() }
                    else{ return }
                }
                else if (this.preparation_expanded && this.selectedRow?.['LäkemedelsId'] == medIdOrPrescId){ return }
                if (oneDose) {
                    const currentMedicine = this.allMedicines.filter(medicine => medicine.prescription['OrdinationsId'] == medIdOrPrescId)[0];
                    currentMedicine['Övrigt'] = 'Scannar';
                    this.selectRow(currentMedicine, false);
                }
                else {
                    const currentMedicine = this.allMedicines.filter(medicine => medicine['LäkemedelsId'] == medIdOrPrescId)[0];
                    this.selectRow(currentMedicine, false);
                }
                this.preparation_expanded = true;
            }
        },
        toAdministration(){
            if (this.modalWindowIsUp) { return }
            this.view = 'administration';
            this.selectedRow = null;
        },
        async backToPreparation(){
            await this.confirmDialogue(`Vill du avbryta administreringen?`, 'Ja, avbryt', 'Nej, fortsätt');
            if (this.confirmDialogueResult) {
                this.view = 'medicines';
                this.selectedRow = null;
            }
        }
    },
    computed: {
        allMedicines(){
            return this.currentPatientMedicines.concat(this.generalMedicines);
        },
        modalWindowIsUp(){
            return this.g_expanded || this.note_expanded || this.preparation_expanded;
        },
        timeNow(){
            var today = new Date();
            var date = today.getFullYear() + '-' + String((today.getMonth() + 1)).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            var time = String(today.getHours()).padStart(2, '0') + ":" + String(today.getMinutes()).padStart(2, '0') + ":" + String(today.getSeconds()).padStart(2, '0');
            return date + ' ' + time;
        },
        g_visible(){
            let result = false;
            for (const medicine of this.currentPatientMedicines_8oclock.concat(this.currentPatientMedicines_noTime_and_general)) {
                if (medicine['G'] == 'g') {
                    result = true;
                }
            }
            return result;
        }
    },
}).mount('#app')