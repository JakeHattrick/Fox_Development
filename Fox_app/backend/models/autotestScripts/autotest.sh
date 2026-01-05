#!/bin/bash
##**********************************************************************************
## Project       : RMA_NVIDIA
## Filename      : autotest.sh
## Description   : NVIDIA test automatic
## Usage         : n/a
##
##
## Version History
##-------------------------------
## Version       : 1.0.9
## Release date  : 2024-03-08
## Revised by    : Winter Liu
## Description   : Initial release
## add compatibility with clear BBX station 2024-04-26 "when wareconn can get test information by station this function no need"
## Add the transmission parameters type, and return the information according to the warranty and the station 2024-05-07
## Add script version control 2024-05-07
## Add analysis Log 2024-05-22
## Add run mode 2024-06-15
## add install tool function 2024-08-26
## add new log for nvidia 2024-08-26
## add blocking test pass but wareconn doesn't auto-pass feature
## add upload result to LF API 2024-11-08
## add capture "ctrl+c" abnormal signal to terminate the test and delete local diag to prevent misjudgment 2024-12-14
##--------------------------------------------------------------------------------------------------------------------------------
## Version       : 1.1.0
## Release date  : 2025-04-21
## Revised by    : Winter Liu
## Description   : 1.Adding a warning message 2.Adding check station function 3.Adding TPC station 
## Description   : 4.list station from ini file 
##--------------------------------------------------------------------------------------------------------------------------------
## Version       : 1.1.1
## Release date  : 2025-05-26
## Revised by    : Winter Liu
## Description   : 1.change URL form http://$API_IP to https://$API_IP:4443; 2.check script md5sum value
##--------------------------------------------------------------------------------------------------------------------------------
## Version       : 1.1.1
## Release date  : 2025-09-17
## Revised by    : Winter Liu
## Description   : add retry api function
##--------------------------------------------------------------------------------------------------------------------------------
## Version       : 1.1.2
## Release date  : 2025-09-18
## Revised by    : Winter Liu
## Description   : CHIFLASH change diag
##--------------------------------------------------------------------------------------------------------------------------------
## Version       : 1.1.2
## Release date  : 2025-09-18
## Revised by    : Winter Liu
## Description   : remove get token
##**********************************************************************************


[ -d "/mnt/nv/logs/" ] || mkdir /mnt/nv/logs       ###    Ensure local log storage exists
[ -d "/mnt/nv/HEAVEN/" ] || mkdir /mnt/nv/HEAVEN/     ###    HEAVEN= GPU benchmark/ stress test, this directory stores - test binaries, output files, and temperary  benchmark results 
[ -d "/mnt/nv/server_diag" ] || mkdir /mnt/nv/server_diag  ###   Diag server - downloaded test tools, keeps diagnostic seperate from logs
[ -d "/mnt/nv/server_logs" ] || mkdir /mnt/nv/server_logs  ###   Mount point for central log server, logs are copied here before upload, if this directory does not exists, uploads fails
[ -d "/mnt/nv/mods/test" ] || mkdir /mnt/nv/mods/test   ###   mods = module, Contains: test scripts (*.sh), diagnostics, binaries - Think of this as the test workspace
[ -d "/mnt/nv/mods/test/cfg" ] || mkdir /mnt/nv/mods/test/cfg   ###  Stores: (*.ini), (*.RSP), station config, SN/PN mapping files, Critical for station detection and routing logic
[ -d "/mnt/nv/mods/test/logs" ] || mkdir /mnt/nv/mods/test/logs   ###   Stores: (log.txt), parsed test output, intermediate logs before upload


###   Section 1: Core Directory Layout
###   These maps physical directories to logical names used everywhere
export HEAVEN="/mnt/nv/HEAVEN/"   ### Used by GPU stress tests (HEAVEN), keeps heavy benchmark files off root FS
export Diag_Path="/mnt/nv/server_diag"   ### Used for pulling scripts, INI files, updates, OPID validation. Referenced in: script_check(), update(), Input_Server_Connection
export Logs_Path="/mnt/nv/server_logs"  ###   Central log upload directory, logs copied here before API upload
export mods="/mnt/nv/mods/test"   ### One of the most important variable. Used as base for: configs, logs, binaries, 


###   Section 2: File-Level Paths
###   These defines exact files used later
export CSVFILE="$mods/core/flash/PESG.csv"   ###   Firmware / flashing configuration, Used during board programming
export CFGFILE="$mods/cfg/cfg.ini"   ###   Global test parameters, Station behavior, Feature toggles
export LOGFILE="$mods/logs"   ###   Used heavily in: analysis_log(), test output, result packaging. If this is wrong --> no logs saved

###   Section 3: Scan File 
export SCANFILE="$mods/cfg/uutself.cfg.env" ### Used for: SN detection, operator ID, Fixture ID, slot logic
export Local_Logs="/mnt/nv/logs"   ### Local fallback logs: Local only storage - Used if server logs unavailable

###   Section 4: Network Configuration (Sites)
export TJ_logserver_IP="10.67.240.77"  ### TJ (Taiwan / Tianjin)
export TJ_diagserver_IP="10.67.240.67"
export NC_logserver_IP="192.168.102.20"   ### NC (North America)
export NC_diagserver_IP="192.168.102.21"
export NC_API_IP="192.168.102.20"
export TJ_API_IP="10.67.240.77"

###   Section 5: Operator ID validation
export OPID="$Diag_Path/OPID/OPID.ini"  ###   Opeartor authentication
export INI_folder="$Diag_Path/INI/"   ###   station routing, error code handling

###   Section 6: Script self-update Logic 
###   Auto update + reboots if mismatch
export Script_File="autotest.sh"   ###   Used in: script_check(). Local script checksum, server script checksum

###   Section 7: Site selection a& Runtime Overrides 
###   Later filled dynamically
export site="NC"
export logserver_IP=""
export diagserver_IP=""
export API_IP=""
export ID=""
export SECRET=""

###   Section 8: API Authentication
###   Used by: curl ... /Oauth/token
export TID="client_id=NocHScsf53aqE"
export TSECRET="client_secret=f8d6b0450c2a2af273a26569cdb0de04"
export NID="client_id=vE7BhzDJhqO"
export NSECRET="client_secret=0f40daa800fd87e20e0c6a8230c6e28593f1904c7edfaa18cbbca2f5bc9272b5"
export TYPE="grant_type=client_credentials"

###   Section 9: Server Credentials
###   Used when: mounting servers, copying logs, rsync operations
export TJ_pw_diag="TJ77921~"
export TJ_pw_log="NVD77921~"
export NC_pw_diag="TJ77921~"
export NC_pw_log="TJ77921~"

###   Section 10: Runtime Data Holders
###   These are: emptyt placeholders, filled during runtime, used later in decision logic
export pw_diag=""
export pw_log=""
export Input_Upper_699PN=""
export Input_Lower_699PN=""

###   Defines: Variable attributes, arrays, control scope & behavior
###   Think of it as: "Create this variable, and treat it in a special way"
###   -u : Forces the variable to be UPPERCASE, every assignment is automatically converted. 
###   -a: Declares an array
declare -u station   ###   Read: "please input station:" station
declare -u fixture_id   ### Scan: Fixture_id
declare -a list_st=()   ###   list: all stations in array, then define valid station, drive routing logic, then use in validation
declare -a list_stn=()   ###  Another station list: Used in: UI messages, routing display, station transitions
declare -a single_list_stn=()   ###   Stations that can ONLY test one unit at a time
declare -a list_st_all=()   ###  Master station list: all valid station, used for hard validation


###   Versioning & Identity
Script_VER="1.1.2"    ### Used by script_check() to verify correct script version
CFG_VERSION="1.1.2"   ### Send to Wareconn API
PROJECT="TESLA"       ### Idenitifies product family (TESLA GPUs)

###   Core Runtime Result Flags
###   Used to: stop tests early, control retest logic, bypass API in debug mode
Process_Result=""     ### Temporary step result
Final_status=""       ### Final PASS/FAIL
cont="true"           ### Whether to continue flow
Run_Mode=0            ### 0= production, 1 = debug

###   Serial Number variables 
###   This allows: scan validation, API validation, multi-card fixtures, mismatch detection
Input_Upper_SN=""     ### SN pulled from Wareconn
Input_Lower_SN=""
Output_Upper_SN=""    ### SN used for testing/logging
Output_Lower_SN=""
Scan_Upper_SN=""      ### What barcode scanner reads
Scan_Lower_SN=""

###   Part Number
###   identify GPU variant, enforce matching PN in dual-slot tests
###   It prevents: mixing SKUs, invalid dual testing
Input_Upper_PN=""
Input_Lower_PN=""
Output_Upper_699PN=""
Output_Lower_699PN=""

###   Station Tracking
###   Heavily used in: routing, check_station(), API uploads, retest logic
current_stc_name=""        ### Active station name
Input_Upper_Station=""     ### From Wareconn
Input_Lower_Station=""     
Tstation=""                ### Target station for analysis

###   Diagnostic/Tool Versions
###   Purpose: Traceability, Failure analysis, Compliance
diag_name=""
diag_VER=""
HEAVEN_VER=""
NVFLASH_VER=""
NVINFOROM=""
BIOS_VER=""
BIOS_NAME=""
VBIOS_VERSION=""

###   Hardware & Machine Identity
###   Tells which tester can ran the GPU
MACHINE=""
fixture_id=""

###   Failure & Error Handling
###   Used in: API result upload, retest decision, operator messaging
Fail_Module=""
FactoryErrorCode=""     ### if the FactoryErrorCode = 0 --> PASS, Non-zero ---> FAIL, empty ---> RUNNING/ aborted
FactoryErrorMsg=""

###   Dynamic Identifier for the test logs file
###   It is used for: analysis_log(), log upload functions, failure traceability
LogName=""

###   Upper / Lower slot Metadata
###   Dual-slot testers require: Independent metadata, same script, same logic || Used for: Slot mapping, logging, retest decision
Input_Lower_ESN=""
Input_Lower_Eboard=""
Input_Lower_Status=""
Input_Lower_HSC=""
Input_Upper_ESN=""
Input_Upper_Eboard=""
Input_Upper_Status=""
Input_Upper_HSC=""

###   Test Control
###   This controls entire script branchiing
testqty=""          ###     testqty=1 ---> Single-slot, testqty=2 ---> Dual-slot
test_item=""        ###     Which test module is running



######test station list######
#list_st="FLA BAT BIT FCT FPF OQA FT FLB IST CHIFLASH DG5 FLC IST2 EFT ZPI FLA1 FLA2 ORT ORN TPC" ###no need spare parts station list###
#list_stn="NVL DG3 DG4 IOT FLK"                   ###need more spare parts station list###
#single_list_stn="FLA FLB CHIFLASH IOT FLK NVL FLC FLA2 TPC"                    ###single baord station list###
#list_st_all="CHIFLASH FLA FLB BAT BIT FCT FT FPF OQA IST NVL DG3 DG4 DG5 IOT FLK FLA1 FLA2 FLC IST2 EFT ZPI ORT ORN TPC" ###ALL TEST STATION 2024-06-15

#####################################################################
#                                                                   #
# Pause                                                             #
#                                                                   #
#####################################################################

pause()
{
    echo "press any key to continue........"
    local DUMMY
    read -n 1 DUMMY
    echo
}

#####################################################################
#                                                                   #
# Get Config From .ini                                              #
#                                                                   #
#####################################################################
get_config()
{
    echo $(cat ${CFGFILE} | grep "^${1}" | awk -F '=' '{print$2}')
    if [ 0 -ne $? ]; then
        echo "${1} config not found.(${CFGFILE})" | tee -a $LOGFILE/log.txt
        show_fail_message "Config Not Found" && exit 1
    fi
}

######################################################################
#                                                                    #
# Show Pass message (color: green)                                   #
#                                                                    #
######################################################################
show_pass_msg()
{
    _TEXT=$@
    len=${#_TEXT}

    while [ $len -lt 60]
    do
    _TEXT=$TEXT"-"
    len=${#_TEXT}
    done 

    _TEXT=$_TEXT"[ PASS ]"

    echo -ne "\033[32m"
    echo -ne "\t"$_TEXT
    echo -e "\033[0m"
}