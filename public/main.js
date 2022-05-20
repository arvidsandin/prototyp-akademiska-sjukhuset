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
    },
    methods: {
        selectRow: function (row) {
            if (this.g_expanded) {
                return;
            }
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

            medicineCopy['G'] = medicineCopy['Läkemedel valt'] ? 'G' : 'g';
            if (medicine['Finns på'].split(', ').filter(locationId => locationId == 'PL1').length > 0) { medicineCopy['G'] = '' }
            
            medicineCopy['Info'] = '';
            medicineCopy['Info Långform'] = '';
            let replacementExists = false;
            if (medicineCopy['G'] != '' && medicineCopy['Läkemedel valt']) {
                for (const replMed of this.getReplacingMedicines(medicineCopy)) {
                    if (this.getPlaces_sorted(replMed)['PlatsId'] == 'PL1'){
                        replacementExists = true;
                    }
                }
            }
            if (replacementExists) {
                medicineCopy['Info'] = 'Finns';
                medicineCopy['Info Långform'] = 'Finns';
            }
            else{
                let locationNames = [];
                let locationNamesLong = [];
                for (const location of this.getPlaces_sorted(medicineCopy)) {
                    locationNames.push(location['Kortnamn']);
                    locationNamesLong.push(location['Namn']);
                }
                medicineCopy['Info'] = locationNames.join(', ');
                medicineCopy['Info Långform'] = locationNamesLong.join(', ')
            }
            
            medicineCopy['Övrigt'] = '';

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
        rightClick(event, row) {
            if (this.g_expanded) { return }
            this.rightClickedRow = row;
            if (document.getElementById("contextMenu").style.display == "block") {
                this.hideMenu();
            }
            var menu = document.getElementById("contextMenu")
            menu.style.display = 'block';
            menu.style.left = event.pageX + "px";
            menu.style.top = event.pageY + "px";
            
        },
        hideMenu() {
            document.getElementById("contextMenu").style.display = "none";
            this.rightClickedRow = null;
        },
    },
    computed: {

    },
}).mount('#app')