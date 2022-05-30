Vue.createApp({
    data() {
        return {
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
            currentPatientId: 'P1',
            firstTabSelected: true,
            g_expanded: false,
            note_expanded: false,
            preparation_expanded: false,
            noteEdited: false,
            selectedRow: null,
            rightClickedRow: null,
        }
    },
    mounted() {
        fetch('./assets/data/Läkemedel.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.medicines = results.data;
                    },
                    header: true
                });
            })
        fetch('./assets/data/Ordinationer.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.prescriptions = results.data;
                    },
                    header: true
                });
            })
        fetch('./assets/data/Generella_ordinationer.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.generalPrescriptions = results.data;
                    },
                    header: true
                });
            })

        fetch('./assets/data/Platser.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    complete: results => {
                        this.locations = results.data;
                    },
                    header: true
                });
            })
            .then(() => {
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
                console.log(this.currentPatientPrescriptions);
                console.log(this.generalPrescriptions);
                console.log(this.currentPatientMedicines);
                console.log(this.generalMedicines);
                console.log(this.currentPatientMedicines_8oclock);
                console.log(this.currentPatientMedicines_noTime);
            })
        var self = this;
        Mousetrap.bind('ctrl+a', function (e) { self.scanMedicine(e, true, 'O2') });
        Mousetrap.bind('ctrl+e', function (e) { self.scanMedicine(e, false, 'L4') });
    },
    methods: {
        debug(){
            console.log(prescriptions.filter(presc => presc['OrdinationsId'] == selectedRow.prescription['OrdinationsId']))
        },
        selectRow: function (row) {
            if (this.modalWindowIsUp) { return }
            if (this.selectedRow == row) {
                this.selectedRow = null;
            }
            else {
                this.selectedRow = row;
            }
        },
        isSelectedRow: function (row) {
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
            medicineCopy['Batchnummer'] = '';
            medicineCopy['Form'] = '';
            medicineCopy['Dos'] = '';
            medicineCopy['Kommentar'] = '';
            medicineCopy.prescription = prescription;
            
            //Endast 'G' om 'Har utbyte skett' är 1
            if (medicineCopy['Läkemedel valt']) {
                medicineCopy['G'] = prescription['Har utbyte skett'] == '1' ? 'G' : '';
                //Vid stort G, Info är namnet på det utbytta läkemedlet
            }
            else if (this.getPlaces_sorted(medicine)[0]?.['PlatsId'] == 'PL1') {
                medicineCopy['G'] = '';
                medicineCopy['Info'] = 'Finns';
                medicineCopy['Info Långform'] = 'Finns';
            }
            else {
                medicineCopy['G'] = '';
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
            this.selectedRow = null;
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
            this.selectedRow['Övrigt'] = 'Iordningställd';
            if (document.getElementById('preparedMedication_editable').innerText == this.selectedRow.prescription['(läkemedelsnamn)']) {
                this.selectedRow['G'] = '';
                this.selectedRow['Info'] = '';
            }
            else{
                this.selectedRow['G'] = 'G';
                this.selectedRow['Info'] = document.getElementById('preparedMedication_editable').innerText;
            }
            this.selectedRow['Aut'] = '0';
            this.selectedRow['Kyl'] = '0';
            this.selectedRow['Tid'] = document.getElementById('time_editable').innerText;
            this.selectedRow['Iordningställt läkemedel'] = document.getElementById('preparedMedication_editable').innerText
            this.selectedRow['Mängd'] = document.getElementById('amount_editable').innerText;
            this.selectedRow['Batchnummer'] = document.getElementById('batchNumber_editable').innerText;
            this.selectedRow['Form'] = document.getElementById('form_editable').innerText;
            this.selectedRow['Dos'] = document.getElementById('dose_editable').innerText;
            this.selectedRow['Kommentar'] = document.getElementById('comment_editable').innerText;
            this.closePreparation();
        },
        scanMedicine(event, oneDose, medicineOrPrescriptionId){
            event.preventDefault();
            this.g_expanded = false;
            if (this.note_expanded && window.confirm("Avbryt anteckning?")) {
                this.closeNote();
            }
            else if(this.note_expanded) { return }
            if (this.preparation_expanded && this.selectedRow?.['LäkemedelsId'] != medicineOrPrescriptionId && window.confirm('Du har skannat ' + medicineOrPrescriptionId + '.Vill du avbryta iordningställandet av ' + this.selectedRow?.['Namn'] + '?')) {
                this.closePreparation();
            }
            else if (this.preparation_expanded && this.selectedRow?.['LäkemedelsId'] == medicineOrPrescriptionId){ return }
            if (oneDose) {
                const currentMedicine = this.allMedicines.filter(medicine => medicine.prescription['OrdinationsId'] == medicineOrPrescriptionId)[0];
                currentMedicine['Övrigt'] = 'Scanna';
                this.selectRow(currentMedicine);
            }
            else {
                const currentMedicine = this.allMedicines.filter(medicine => medicine['LäkemedelsId'] == medicineOrPrescriptionId)[0];
                this.selectRow(currentMedicine);
            }
            this.preparation_expanded = true;
        },
    },
    computed: {
        allMedicines(){
            return this.currentPatientMedicines.concat(this.currentPatientMedicines_8oclock.concat(this.currentPatientMedicines_noTime));
        },
        modalWindowIsUp(){
            return this.g_expanded || this.note_expanded || this.preparation_expanded;
        },
        timeNow(){
            var today = new Date();
            var date = today.getFullYear() + '-' + String((today.getMonth() + 1)).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            var time = String(today.getHours()).padStart(2, '0') + ":" + String(today.getMinutes()).padStart(2, '0') + ":" + String(today.getSeconds()).padStart(2, '0');
            return date + ' ' + time;
        }
    },
}).mount('#app')