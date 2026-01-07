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

###   Section 7: Site selection & Runtime Overrides 
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

##############################################################################
#                                                                            #
# Pause  : This allows script to stop execution until an operator interacts  #
#                                                                            #
##############################################################################

pause()    
{
    echo "press any key to continue........"
    local DUMMY
    read -n 1 DUMMY
    echo
}

#####################################################################
#                                                                   #   Reads the values from cfg.ini by key name
# Get Config From .ini                                              #   This lets the same script run on: Different fixtures, different stations, different sites without editing the scripts
#                                                                   #   This feeds into: Station validation, API routing, log server selection, pass/fail logic
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
#                                                                    #  It is called after a module complete successfully. This is operator confidence feedback. 
# Show Pass message (color: green)                                   #  This function is purely UI - It only display status. It does NOT determine any pass/fail logic
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

######################################################################
#                                                                    #  It is called after module is executed successfully. 
# Show Fail message (color: red)                                     #  This display is purely UI - It does not determine pass/fail logic. 
#                                                                    #
######################################################################
show_fail_msg()
{
    _TEXT=$@
    len=${#_TEXT}

    while [ $len -lt 60 ]
    do
    _TEXT=$_TEXT"-"
    len=${#_TEXT}
    done

    _TEXT=$_TEXT"[ FAIL ]"

    echo -ne "\033[31m"
    echo -ne "\t"$_TEXT
    echo -e "\033[0m"

#    convert_err "$1"
}

######################################################################
#                                                                    # This also is purely for readability - not logic. 
# Show title message                                                 # During the log running script - we can see what stage is running, debuggers can quickly locate failures in logs
#                                                                    # It is a cosmetic function that makes long factory logs readable by clearly marking each test stages
######################################################################
show_title()
{
    _TEXT=$@
    len=${#_TEXT}

    while [ $len -lt 60 ]
    do
    _TEXT=$_TEXT"-"
    len=${#_TEXT}
    done
    echo "$_TEXT"
}

######################################################################
#                                                                    #
# Show Pass message (color: green)                                   #  Prints one line of green bold text for passing. 
#                                                                    #
######################################################################
show_pass_message()
{       
    tput bold   
    TEXT=$1
    echo -ne "\033[32m$TEXT\033[0m"
    echo
}

######################################################################
#                                                                    #
# Show Fail message (color: red)                                     #  Prints one line of red bold text for failing. 
#                                                                    #
######################################################################
show_fail_message()
{ 
     tput bold
     TEXT=$1
     echo -ne "\033[31m$TEXT\033[0m"
     echo
}

######################################################################
#                                                                    #
# Show Warning message (color: yellow)                               # Prints yellow bold text for warning. 
#                                                                    #
######################################################################
show_warning_message()
{ 
     tput bold
     TEXT=$1
     echo -ne "\033[33m$TEXT \033[0m"
	 echo 
}

#####################################################################
#                                                                   #
# Show PASS       (Big ASCII pass)                                  #  Purely UX/UI
#                                                                   #
#####################################################################
show_pass()
{
	echo
	echo
	echo
	echo
	echo
	echo
	echo
	echo
	echo	
	echo	
	show_pass_message " 			XXXXXXX     XXXX     XXXXXX    XXXXXX"
	show_pass_message " 			XXXXXXXX   XXXXXX   XXXXXXXX  XXXXXXXX"
	show_pass_message " 			XX    XX  XX    XX  XX     X  XX     X"
	show_pass_message " 			XX    XX  XX    XX   XXX       XXX"
	show_pass_message " 			XXXXXXXX  XXXXXXXX    XXXX      XXXX"
	show_pass_message " 			XXXXXXX   XXXXXXXX      XXX       XXX"
	show_pass_message " 			XX        XX    XX  X     XX  X     XX"
	show_pass_message " 			XX        XX    XX  XXXXXXXX  XXXXXXXX"
	show_pass_message " 			XX        XX    XX   XXXXXX    XXXXXX"
	echo
	echo

}

#####################################################################
#                                                                   #  It prints a structured failure report.
# Show FAIL          (CRITICAL)                                     #  This function is a single place where SN, PN, fixtures IDs, Error code and final fail status is shown. 
#                                                                   #  
#####################################################################
show_fail()
{
 
	echo
	show_fail_message "############################################################################"
	show_fail_message "Start time              :$start_time"                                            # Start time
	show_fail_message "End time                :$(date '+%F %T')"                                       # End time
	show_fail_message "Part number             :${Input_Upper_PN}"                                      # PN
	show_fail_message "diag                    :${diag_name}"                                           # diag name
	show_fail_message "Serial number           :${1}"                                                   # Serial number
	show_fail_message "operator_id             :`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`"       # Operator ID
	show_fail_message "fixture_id              :`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`"        # Fixture ID
	show_fail_message "VBIOS                   :$BIOS_VER"                                              # BIOS
	show_fail_message "FactoryErrorCode        :${2}"                                                   # Error Code
	show_fail_message "FactoryErrorMsg         :${3}"                                                   # Error message
	show_fail_message "Status                  :FAIL"                                                   # Status
	show_fail_message "############################################################################"
	echo 	
}

#################capture "ctrl+c"############################################
#       Ctrl + c  -->   Clean exit
#       Partial logs --> Cleaned
#       Disk usage --> Controlled
#       Debug --> Clear
#       This gives us RUNNING -->  INTERRUPTED state.
#This block safely intercepts Ctrl+C, shows a warning, cleans up temporary diagnostics, and exists clealy to protect test integrity and logs
#############################################################################
function trap_ctrlc()
{
    # perform clean up here 2024-12-14

    echo -e ""
    echo -e ""
    echo -e "\033[47;30m\033[05 m    LINE No: ${LINENO}  Ctrl-C caught ...   \033[0m"
    echo -e ""
    echo -e ""
    if[ -n "${diag_VER}" ]; then
        if [$mods/$diag_VER]; then
            rm -rf $mods/$diag_VER
            echo "delete local diag $diag_VER complete"
        fi
    fi

        exit 1
}
trap "trap_ctrlc" 2

############################################################################


# 从文件加载数据到数组       Loads line from an .ini file into Bash array
# This function loads station/error rule file into Bash array so the script can make runtime decisions. 
load_array_from_file()
{
    local arr_ref=$1
    local file=$2

    if [ ! -f "${INI_folder}/$file" ]; then
        echo "make sure $file is exist plaease check diag server"
        exit 1
    fi

    eval "$arr_ref=()"

    mapfile -t arr_ref < "${INI_folder}/$file" 2>/dev/null    

}

####get information from wareconn####################################

    #*******************************************************************************************************************************************************************#
    #                                                                                                                                                                   #
    #   This function asks Wareconn     -->     "Is this SN allowed to test here?",                                                                                     #
    #                                                                                                                                                                   #
    #   Converts the answer into local config file, and blocks testing if factory state and local state disagree.                                                       #
    #                                                                                                                                                                   #
    #*******************************************************************************************************************************************************************#

Input_Wareconn_Serial_Number_RestAPI_Mode()  # This function queries wareconn using a SN, retrieves test/station metadata, and writes into a local ".RSP" config file.   
{
    ### API
    now_stn=""                              # Intended to store current station (Not fully used)
    Input_RestAPI_Message=""                # raw JSON response from Wareconn API 

    ### Get Token     f            
    #**************************************************************************************************************************#
    #                                                                                                                          #
    #   Commented out section:                                                                                                 #
    #   Originally: Wareconn API required OAuth token, Token Fetched first, then used in header                                #
    #   Likely: API now whitelisted by IP, token embedded upstream, simplified for factory reliability                         #
    #                                                                                                                          #
    #**************************************************************************************************************************#            
    # max_attempts=3
    # attempt=1
    # sleep_time=5
    # timeout=60
    # while [ $attempt -le $max_attempts ]; do
        # show_warning_message "connecting API $attempt times (timeout: ${timeout}s)..."   
        # Input_RestAPI_Message=$(curl -m 60 -k "https://$API_IP:443/api/v1/Oauth/token?${ID}&${SECRET}&${TYPE}")
        # curl_exit_code=$?

        # if [ $curl_exit_code -eq 0 ]; then
            # break
        # fi

        # if [ $attempt -lt $max_attempts ]; then
            # sleep $sleep_time
        # fi

        # ((attempt++))
    # done

    # if [ -n "$Input_RestAPI_Message" ] && echo "$Input_RestAPI_Message" | jq -e '.code == 0' > /dev/null; then
        # token=$(echo "$Input_RestAPI_Message" | awk -F '"' '{print $10 }')
        # show_pass_message "get_token successful:$token"	
    # else
        # show_fail_message "$Input_RestAPI_Message"
        # show_fail_message "get token Fail Please check net cable or call TE"
        # exit 1
    # fi

    ### Get Information from Wareconn
   
    echo "get test information from wareconn API"
        if [ "$Run_Mode" = "0" ]; then
            max_attemps=3
            attemp=1
            timeout=60
            while [ $attempt -le $max_attempts ]; do
                show_warning_message "connecting API $attempt times (timeout: ${timeout}s)..."

                Input_RestAPI_Message=$(curl -m 60 -k "$surl?serial_number=$1&type=war,sta")
                curl_exit_code=$?

                if [ $curl_exit_code -eq 0 ]; then
                    break
                fi

                if [ $attemp -lt $max_attempts ]; then
                    sleep $sleep_time
                fi

                ((attempt++))
            done

        else

            max_attemps=3
            attempt=1
            sleep_time=5
            timeout=60
            while [ $attempt -le $max_attempts ]; do
                show_warning_message "connecting API $attempt times (timeout: ${timeout}s)..."

                Input_RestAPI_Message=$(curl -m 60 -k "$surl?serial_number=$1&type=stc&stc_name=$2")
                curl_exit_code=$?

                if [ $curl_exit_code -eq 0 ]; then
                    break
                fi

                if [ $attempt -lt $max_attempts ]; then
                    sleep $sleep_time
                fi

                ((attempt++))
            done
        fi
    if [ -n "$Input_RestAPI_Message" ] && echo "$Input_RestAPI_Message" | jq -e '.code == 0' > /dev/null; then

        if [ -f $mods/cfg/$1.RSP ] && [ "$Run_Mode" = "0" ]; then     # If this SN has been tested before AND we are in production mode    

            # Has the unit already passed this station locally, but wareconn hasn't updated yet? 
            # Fstation=... (from old RSP), findlog=... PASS.log, Sstation=... (from new API)
            # This prevents: Double-testing, Station skipping, Data inconsistency

            Fstattion=$(echo $(cat $mods/cfg/$1.RSP | grep "^current_stc_name" | awk -F '=' '{print$2}'))
            findlog=$(find $Local_Logs/ -name "$1_${Fstation}_`date +"%Y%m%d"`*PASS.log" 2>/dev/null)

            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/"code":0,"data"://g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/{{//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/}}//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/\[//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/\]//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/:/=/g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/"//g')
            echo "$Input_RestAPI_Message" | awk -F ',' '{ for (i=1; i<=NF; i++) print $i }' > $mods/cfg/$1.RSP
            Sstation=$(echo $(cat $mods/cfg/$1.RSP | grep "^current_stc_name" | awk -F '=' '{print$2}'))
            if [ -n "$findlog" ] && [ "$Fstation" = "$Sstation" ];then
                show_fail_message "$1 have pass $Fstation station but wareconn not please wait a minute and retest"
                show_fail_message "if still not pass next station please call TE or wareconn team!!!"
                exit 1
            else
                show_pass_msg "$1 Get test information from wareconn!!!"
            fi
        else
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/"code":0,"data"://g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/{{//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/}}//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/\[//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/\]//g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/:/=/g')
            Input_RestAPI_Message=$(echo $Input_RestAPI_Message | sed 's/"//g')
            echo "$Input_RestAPI_Message" | awk -F ',' '{ for (i=1; i<=NF; i++) print $i }' > $mods/cfg/$1.RSP
            show_pass_msg "$1 Get test information from wareconn!!!"
        fi
    else
        show_fail_message "$Input_RestAPI_Message"
        show_fail_message "$1 Get test information from Wareconn Fail Please call TE"
        exit 1

    fi
}

##mount server folder#################################################

#*******************************************************************************************************************#
#                                                                                                                   #
#   This function ensure required network shares (Diag + Logs server) are mounted before testing continues.         #
#                                                                                                                   #
#*******************************************************************************************************************#
Input_Server_Connection()
{
    echo -e "\033[33m Network Contacting : $Diag_Path, wait ...     \033[0m"
    while true
        do  
            unmount $Diag_Path >/dev/null 2>&1
            mount -t cifs -o username=administrator,password=$pw_diag //$diagserver_IP/e/current $Diag_Path
            if [ $? -eq 0 ]; then
                break
            fi
        done
    echo -e ""
    sleep 5
    echo -e "\033[33m   Network Contacting : $Logs_Path, wait ....    \033[0m"

    while true
        do  
            unmount $Logs_Path >/dev/null 2>&1
            mount -t cifs -o username=administrator,password=$pw_log //$logserver_IP/d $Logs_Path
            if [ $? -eq 0 ]; then
                break
            fi
        done
    echo -e ""
    sleep 5
}

###SCAN################################################################

#*************************************************************************************************************************************************#
#                                                                                                                                                 #
#   This function forces the operator to scan and validate operator ID, fixture ID, and board serial number before testing,                       #
#   then writes them into a shared config file used by later test steps.                                                                          #
#                                                                                                                                                 #
#*************************************************************************************************************************************************#              

Output_Scan_Infor()
{
    chk_len()
    {
        if [ $(expr length ${2}) -ne $3 ]; then
            echo "Please check ${1} (${2}, length ${3}) " | tee -a $LOGFILE/log.txt && flg = 1
        fi
    }

    scan_label()
    {

        status=0
        flg=0
        num=0
        let num+=1

        while [ $status = 0 ]; do
            if [ $flg = 1 ]; then
                read -p " $num. Scan operator ID again:" operator_id
            else
                read -p " $num. Scan Operator ID:" operator_id
            fi
            if grep -q "^$operator_id$" $OPID; then
                if [ $(expr length $operator_id) -eq 8 ] || [ -n "$operator_id" ]; then
                    status=1
                else
                    flg=1
                fi
            else
                flg=1
            fi
        done

        let num+=1
        status=0
        flg=0
        while [ $status = 0 ]; do
            if [ $flg = 1 ]; then
                read -p " $num. Scan Fixture ID (length 9) again:" fixture_id
            else
                read -p " $num. Scan Fixture ID (length 9):" fixture_id
            fi
            if [ $(expr length $fixture_id) -eq 9]; then
                status=1
            else
                flg=1
            fi
        done
        if [ $testqty = "2" ] then

            let num+=1
            status=0
            flg=0
            while [ $status = 0 ]; do
                if [ $flg = 1 ]; then
                    read -p " $num. Scan Board SN1 (length 13) again:" Scan_Upper_SN
                else
                    read -p " $num. Scan Board SN1 (length 13):" Scan_Upper_SN
                fi
                if [ $(expr length $Scan_Upper_SN) -eq 13 ]; then
                    status=1
                else
                    flg=1
                fi
            done

            let num+=1
            status=0
            flg=0
            while [ $status = 0 ]; do
                if [ $flg = 1 ]; then
                    read -p " $num. Scan Board SN2 (length 13) again:" Scan_Lower_SN
                else
                    read -p " $num. Scan Board SN2 (length 13):" Scan_Lower_SN
                fi
                if [ $(expr length $Scan_Lower_SN) -eq 13 ]; then 
                    status=1
                else
                    flg=1
                fi
            done
        else
            let num+=1
            status=0
            flg=0
            while [ $status = 0 ]; do 
            if [ $flg = 1 ]; then
                read -p " $num. Scan Board SN (length 13) again:" Scan_Upper_SN
            else
                read -p " $num. Scan Board SN (length 13):" Scan_Upper_SN
            fi
            if [ $(expr length $Scan_Upper_SN) -eq 13 ]; then
                status=1
            else
                flg=1
            fi
        done
    fi

    }
    if [ ! -f $OPID ]; then
        Input_Server_Connection
    fi
    scan_label
    sed -i 's/operator_id=.*$/operator_id='${operator_id}'/g' $SCANFILE
	sed -i 's/fixture_id=.*$/fixture_id='${fixture_id}'/g' $SCANFILE
	sed -i 's/serial_number=.*$/serial_number='${Scan_Upper_SN}'/g' $SCANFILE
	sed -i 's/serial_number2=.*$/serial_number2='${Scan_Lower_SN}'/g' $SCANFILE
	show_pass_msg "SCAN info OK"
}

#####Read serial number from tester###################################

#*************************************************************************************************************************************#
#                                                                                                                                     #
#   This function automatically detects how many GPUs are installed in the tester and reads their SN and PN directly from hardware,   #
#       without relying on operator scans.                                                                                            #
#                                                                                                                                     #
#*************************************************************************************************************************************#

Read_SN()
{
    ## If either file : (nvflash_mfg) or (uutself.cfg.env) is missing --> reconnect to diag server. 
    if [ ! -f "nvflash_mfg" ] || [ ! -f "uutself.cfg.env" ]; then
        Input_Server_Connection
        if [ -f $Diag_Path/nvflash_mfg ] && [ -f $Diag_Path/uutself.cfg.env ];then
            cp $Diag_Path/nvflash_mfg ./
            [ ! -f "uutself.cfg.env" ] && cp $Diag_Path/uutself.cfg.env ./
        else
            show_warning_message "Please call TE to check diag server, nvflash_mfg or uutself.cfg.env is not exist"
            exit 1
        fi
    fi

    ## Detects number of gpus insterted
    consts=$(./nvflash_mfg -A -a | grep "10DE" | wc -1)
                                    # 10DE --> NVIDIA vendor ID

    # Dual GPU path ( counts ==2 )
     if [ $counts = "2" ]; then

     # Identify PCIe slots --> GPU  (Upper vs Lower Board)
	port1=$(lspci | grep NV | head -n 1 | awk '{ print $1 }')
	port2=$(lspci | grep NV | tail -n 1 | awk '{ print $1 }')

    # Read SN + PN from each GPU  ("./nvflash_mfg -B $port1  --rdobd"  -->  extracts : board's SN + PN )
	Output_Upper_SN=$(./nvflash_mfg -B $port1  --rdobd | grep -m 1 'BoardSerialNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	Output_Upper_699PN=$(./nvflash_mfg -B $port1  --rdobd | grep -m 1 'Board699PartNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	Output_Lower_SN=$(./nvflash_mfg -B $port2  --rdobd | grep -m 1 'BoardSerialNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	Output_Lower_699PN=$(./nvflash_mfg -B $port2  --rdobd | grep -m 1 'Board699PartNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	if [ -z ${Output_Upper_SN} ] && [ -z ${Output_Lower_SN} ]; then
		show_fail_msg "Read SN error Please check!!!"
		exit 1
	else
		show_pass_message "######SerialNumber1:$Output_Upper_SN######"
		show_pass_message "######SerialNumber2:$Output_Lower_SN######" 
		show_pass_msg "Read SN OK"
		testqty="2"
	fi
    
    ##Single-GPU path (count==1)
elif [ $counts = "1" ]; then
	Output_Upper_SN=$(./nvflash_mfg --rdobd | grep -m 1 'BoardSerialNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	Output_Upper_699PN=$(./nvflash_mfg --rdobd | grep -m 1 'Board699PartNumber' | awk -F ':' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
	if [ -z ${Output_Upper_SN} ]; then
		show_fail_msg "Read SN error Please check!!!"
		exit 1
	else
		show_pass_message "######SerialNumber1:$Output_Upper_SN######"
		show_pass_msg "Read SN OK"
		testqty="1"	
	fi
else

    ## Fall back path (No nvflash detected)
	Output_Upper_SN=$(printf $(python3 aardvark/aai2c_fru_eeprom.py 0 400 read 0x50 0x00 256 | cut -d ":" -f 2 | tail -n +5 | xargs | sed 's/ / \\x/ g'| sed 's/^/\\x/' | tr -d " " ) | LC_ALL=C sed 's/[^ -~]/ /g' | xargs -0 | tr ' ' '\n' | awk '$1 ~ /[0-9]{13}/{print $1}' | tail -n -1 )
	if [ -n "$Output_Upper_SN" ];then
		show_pass_message "######SerialNumber1:$Output_Upper_SN######"
		show_pass_msg "Read SN OK"
		testqty="1"
	else	
		show_fail_message "Can't Detect Cards Please Inserd one Card"
		show_fail_msg "Read SN FAIL"
		exit 1
	fi	
	
fi   	
	 
}

#####download diag from diagserver#####################################

#**************************************************************************************************************************************#
#                                                                                                                                      #
#   This function is a core preparatory step in this script. It ensures all the required diagnostic files, firmware, HEAVEN modules,   #
#   and BIOS file are present locally on the tester before the test begins.                                                            #
#                                                                                                                                      #
#**************************************************************************************************************************************#

DownLoad()
{

####-------------prepare diag-------------######
# Ensures local tester always has the latest diag from server or local cache

cd $mods 
ls | grep -v cfg | xargs rm -fr
if [ -n "${diag_name}" ];then
	if [ -d ${Diag_Path}/${MACHINE}/${diag_name} ]; then
	#if [ -d ${Diag_Path}/${Input_Upper_PN}/${diag_name} ]; then
		show_pass_message "DownLoad Diag From Server Please Waiting ..."
		#echo "${diag_VER}"
		#pause
		#cp -rf ${Diag_Path}/${Input_Upper_PN}/${diag_name}/* $mods
		cp -rf ${Diag_Path}/${MACHINE}/${diag_name}/* $mods
		cd $mods
		tar -xf ${diag_VER} 
		if [ $? -ne 0 ];then
			show_fail_message "Please make sure exist diag zip files"
			show_fail_msg "DownLoad Diag FAIL"
			exit 1
		fi	
		#cp  ${Diag_Path}/${MACHINE}/${NVFLAH_VER}/* 
		
	else
		Input_Server_Connection
		if [ -d ${Diag_Path}/${MACHINE}/${diag_name} ]; then
		#if [ -d ${Diag_Path}/${Input_Upper_PN}/${diag_name} ]; then
			show_pass_message "DownLoad Diag From Server Please Waiting ..."
			cp -rf ${Diag_Path}/${MACHINE}/${diag_name}/* $mods
			#cp -rf ${Diag_Path}/${Input_Upper_PN}/${diag_name}/* $mods
			cd $mods
			tar -xf ${diag_VER} 
			if [ $? -ne 0 ];then
				show_fail_message "Please make sure exist diag zip files"
				show_fail_msg "DownLoad Diag FAIL"
				exit 1
			fi	
			#cp  ${Diag_Path}/${MACHINE}/${NVFLAH_VER}/* ./
		else
			show_fail_message "Diag isn't exist Please Call TE"
			show_fail_msg "DownLoad Diag FAIL"
			exit 1
		fi	
	fi
else
	show_warning_message "diag_name is null, please call TE to check the wareconn settings"
	exit 1
fi	
#####------------Prepare HEAVEN------------#####
# Ensure all test scripts / modules are available locally

if [ ! $HEAVEN_VER = "NA" ];then	
	if [ -f $HEAVEN/$HEAVEN_VER ];then
		show_pass_message "DownLoad HEAVEN From Local Please Waiting ..."
		cp -rf $HEAVEN/$HEAVEN_VER $mods/core/mods0
		cd $mods/core/mods0
		tar -xf $HEAVEN_VER 
		if [ $? -ne 0 ];then
			show_fail_message "Please make sure exist HEAVEN zip files"
			show_fail_msg "DownLoad HEAVEN FAIL"
			exit 1
		fi		
	else
		#echo "${Diag_Path}/HEAVEN/$HEAVEN_VER"
		#pause
		if [ -f ${Diag_Path}/HEAVEN/$HEAVEN_VER ]; then
			show_pass_message "DownLoad HEAVEN From Server Please Waiting ..."
			cp -rf ${Diag_Path}/HEAVEN/$HEAVEN_VER $HEAVEN
			cp -rf $HEAVEN/$HEAVEN_VER $mods/core/mods0
			cd $mods/core/mods0
			tar -xf $HEAVEN_VER 
			if [ $? -ne 0 ];then
				show_fail_message "Please make sure exist HEAVEN zip files"
				show_fail_msg "DownLoad HEAVEN FAIL"
				exit 1
			fi		
		else
			Input_Server_Connection
			if [ -f ${Diag_Path}/HEAVEN/$HEAVEN_VER ]; then
				show_pass_message "DownLoad HEAVEN From Server Please Waiting ..."
				cp -rf ${Diag_Path}/HEAVEN/$HEAVEN_VER $HEAVEN
				cp -rf $HEAVEN/$HEAVEN_VER $mods/core/mods0
				cd $mods/core/mods0
				tar -xf $HEAVEN_VER 
				if [ $? -ne 0 ];then
					show_fail_message "Please make sure exist HEAVEN zip files"
					show_fail_msg "DownLoad HEAVEN FAIL"
					exit 1
				fi		
			else
				show_fail_message "HEAVEN isn't exist Please Call TE"
				show_fail_msg "DownLoad HEAVEN FAIL"
				exit 1 
			fi
		fi
	fi
fi	
	
####PG520 Prepare DFX files#####
# if [ "$MACHINE" = "G520" ] && [ "$current_stc_name" != "CHIFLASH" ];then ####for clear BBX station### 2024-04-26
	# DFX=$(get_config "Diag3")
	# if [ -f $HEAVEN/$DFX ];then
		# show_pass_message "DownLoad DFX From Local Please Waiting ..."
		# cp -rf $HEAVEN/$DFX $mods/core/mods0
		# cd $mods/core/mods0
		# tar -xf $DFX 
		# if [ $? -ne 0 ];then
			# show_fail_message "Please make sure exist DFX zip files"
			# show_fail_msg "DownLoad DFX FAIL"
			# exit 1
		# fi		
	# else
		# #echo "${Diag_Path}/HEAVEN/$HEAVEN_VER"
		# #pause
		# if [ -f ${Diag_Path}/HEAVEN/$DFX ]; then
			# show_pass_message "DownLoad DFX From Server Please Waiting ..."
			# cp -rf ${Diag_Path}/HEAVEN/$DFX $HEAVEN
			# cp -rf $HEAVEN/$DFX $mods/core/mods0
			# cd $mods/core/mods0
			# tar -xf $DFX 
			# if [ $? -ne 0 ];then
				# show_fail_message "Please make sure exist DFX zip files"
				# show_fail_msg "DownLoad DFX FAIL"
				# exit 1
			# fi		
		# else
			# Input_Server_Connection
			# if [ -f ${Diag_Path}/HEAVEN/$DFX ]; then
				# show_pass_message "DownLoad DFX From Server Please Waiting ..."
				# cp -rf ${Diag_Path}/HEAVEN/$DFX $HEAVEN
				# cp -rf $HEAVEN/$DFX $mods/core/mods0
				# cd $mods/core/mods0
				# tar -xf $DFX 
				# if [ $? -ne 0 ];then
					# show_fail_message "Please make sure exist DFX zip files"
					# show_fail_msg "DownLoad DFX FAIL"
					# exit 1
				# fi		
			# else
				# show_fail_message "DFX isn't exist Please Call TE"
				# show_fail_msg "DownLoad DFX FAIL"
				# exit 1 
			# fi
		# fi
	# fi
# fi	

####------------Prepare BIOS-------------####
# Ensure firmware update / BIOS tests can run

if [ ! ${BIOS_NAME} = "NA" ];then
	if [ -f ${Diag_Path}/${MACHINE}/BIOS/${BIOS_NAME} ]; then
		cp -rf ${Diag_Path}/${MACHINE}/BIOS/${BIOS_NAME} $mods
		show_pass_msg "Diag download OK"
	else
		Input_Server_Connection
		if [ -f ${Diag_Path}/${MACHINE}/BIOS/${BIOS_NAME} ]; then
			cp -rf ${Diag_Path}/${MACHINE}/BIOS/${BIOS_NAME} $mods
			show_pass_msg "Diag download OK"
		else
			show_fail_message "Please make sure $BIOS_NAME is exsit!!!"
			show_fail_msg "Diag download OK"
			exit 1
		fi
	fi
else
	show_pass_msg "Diag download OK"
fi	

}

#####-------------------------run diag---------------------#####
#                                                              #
#                [Choose station]                              #
#                       ↓                                      #
#               [run_command executes test]                    #
#                       ↓                                      #
#               [Logs generated somewhere else]                #
#                       ↓                                      #
#               [Run_Diag searches logs by filename]           #
#                       ↓                                      #
#               [Decide PASS / FAIL]                           #
#                       ↓                                      #
#               [Upload + UI + reboot]                         #
#                                                              #
######------------------------------------------------------####

Run_Diag()
{
if [ $Run_Mode = "0" ];then      #### |||||||--------------------- REST API / Online mode -------------------------- ||||||| ####
	cd $mods
	if [ $testqty = "2" ];then	
		Output_Wareconn_Serial_Number_RestAPI_Mode_Start  ${Scan_Upper_SN} ${Input_Upper_Status}
		Output_Wareconn_Serial_Number_RestAPI_Mode_Start  ${Scan_Lower_SN} ${Input_Lower_Status}
	else
		Output_Wareconn_Serial_Number_RestAPI_Mode_Start  ${Scan_Upper_SN} ${Input_Upper_Status}
	fi	
	# if [ ${current_stc_name} = "FT" ];then
		# test_item="inforcheck bioscheck BAT BIT FCT FPF"
		# run_command "$test_item"
		# if [ $? -eq 0 ];then
			# if [ $testqty = "2" ];then
				# resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FPF*" 2>/dev/null)
				# resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_FPF*" 2>/dev/null)		
				# if [ -n "$resf" ] && [ -n "$resc" ];then
					# Upload_Log ${Scan_Upper_SN} PASS 
					# Upload_Log ${Scan_Lower_SN} PASS
					# show_pass
					# sleep 20
					# reboot
				# elif [ -n "$resf" ] ; then
					# Upload_Log ${Scan_Upper_SN} PASS 
					# show_pass
					# sleep 20
					# reboot
				# else
					# Upload_Log ${Scan_Lower_SN} PASS
					# show_pass
					# sleep 20
					# reboot
				# fi			
			# else
				# Upload_Log ${Scan_Upper_SN} PASS 
				# show_pass
				# sleep 20
				# reboot
			# fi	
		# else
			# if [ $testqty = "2" ];then
				# Upload_Log ${Scan_Upper_SN} FAIL 
				# Upload_Log ${Scan_Lower_SN} FAIL 
				# show_fail
			# else
				# Upload_Log ${Scan_Upper_SN} FAIL 
				# show_fail
			# fi	
		# fi
	if [ ${current_stc_name} = "FLA" ];then
		test_item="rwcsv FLA"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FLA*" 2>/dev/null)
			if [ -n "$resf" ];then
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}				
				check_station ${Scan_Upper_SN} FLA PASS
				show_pass_message "FLA station have passed need poweroff and turn off/on 54v PSU as well"
			else
				show_fail_message "FLA can't find pass log please check" 
			fi	
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_FLA*" 2>/dev/null)
			if [ -n "$ress" ];then
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} FLA FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is FLA! it's not a true fail, please change the tester and retest or call TE!!!"
			fi				
		fi
	elif [ ${current_stc_name} = "FLA2" ];then
		test_item="rwcsv FLA2"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FLA*" 2>/dev/null)
			if [ -n "$resf" ];then
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				#show_pass
				check_station ${Scan_Upper_SN} FLA2 PASS
				show_pass_message "FLA2 station have passed need poweroff and turn off/on 54v PSU as well"
			else
				show_fail_message "FLA2 can't find pass log please check" 
			fi					
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_FLA*" 2>/dev/null)
			if [ -n "$ress" ];then			
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} FLA2 FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is FLA2! it's not a true fail, please change the tester and retest or call TE!!!"
			fi					
		fi	
	elif [ ${current_stc_name} = "FLB" ];then
		test_item="rwcsv FLB"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FLB*" 2>/dev/null)
			if [ -n "$resf" ];then		
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				#show_pass
				check_station ${Scan_Upper_SN} FLB PASS
				if [ "$MACHINE" = "G520" ];then
					sleep 10
					reboot
				else	
					show_pass_message "FLB station have passed need poweroff and turn off/on 54v PSU as well"
				fi
			else
				show_fail_message "FLB can't find pass log please check" 
			fi					
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_FLB*" 2>/dev/null)
			if [ -n "$ress" ];then
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} FLB FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is FLB! it's not a true fail, please change the tester and retest or call TE!!!"
			fi	
		fi
	elif [ ${current_stc_name} = "FLC" ];then
		test_item="rwcsv FLC"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FLC*" 2>/dev/null)
			if [ -n "$resf" ];then		
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				#show_pass
				check_station ${Scan_Upper_SN} FLC PASS
				show_pass_message "FLC station have passed need poweroff and turn off/on 54v PSU as well"
			else
				show_fail_message "FLC can't find pass log please check" 
			fi				
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_FLC*" 2>/dev/null)
			if [ -n "$ress" ];then
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} FLC FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is FLC! it's not a true fail, please change the tester and retest or call TE!!!"
			fi	
		fi
	elif [ ${current_stc_name} = "CHIFLASH" ];then
		test_item="rwcsv CHIFLASH"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_CHI*" 2>/dev/null)
			if [ -n "$resf" ];then		
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				show_pass
				sleep 10
				reboot
			else
				show_fail_message "CHIFLASH can't find pass log please check" 
			fi				
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_CHI*" 2>/dev/null)
			if [ -n "$ress" ];then
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} CHIFLASH FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is CHIFLASH! it's not a true fail, please change the tester and retest or call TE!!!"
			fi	
		fi
	elif [ ${current_stc_name} = "TPC" ];then
		test_item="TPC"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_TPC*" 2>/dev/null)
			if [ -n "$resf" ];then		
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				#show_pass
				check_station ${Scan_Upper_SN} TPC PASS
				#sleep 10
			else
				show_fail_message "TPC can't find pass log please check" 
			fi				
		else
			ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_TPC*" 2>/dev/null)
			if [ -n "$ress" ];then
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
				check_station ${Scan_Upper_SN} TPC FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
			else
				show_warning_message "Current station is TPC! it's not a true fail, please change the tester and retest or call TE!!!"
			fi	
		fi		
	elif [ ${current_stc_name} = ${Tstation} ];then ####for clear BBX station### 2024-04-26
		test_item="inforcheck bioscheck ${current_stc_name}"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${current_stc_name}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${current_stc_name}*" 2>/dev/null)
				if [ -n "$resf" ] && [ -n "$resc" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
						
				elif [ -n "$resf" ] ; then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				elif [ -n "$resc" ];then
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				else
					show_fail_message "${current_stc_name} can't find pass log please check" 
				fi	
			else
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${current_stc_name}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				else
					show_fail_message "${current_stc_name} can't find pass log please check"
				fi	
			fi	
		else
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${current_stc_name}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${current_stc_name}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${current_stc_name} PASS
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					check_station ${Scan_Lower_SN} ${current_stc_name} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}	
				elif [ -n "$resc" ];then	
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					check_station ${Scan_Lower_SN} ${current_stc_name} PASS
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${current_stc_name} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
				else
					ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_${current_stc_name}*" 2>/dev/null)
					resl=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_F_${current_stc_name}*" 2>/dev/null)
					if [ -n "$ress" ] && [ -n "$resl" ];then
						Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
						check_station ${Scan_Upper_SN} ${current_stc_name} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
						Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
						check_station ${Scan_Lower_SN} ${current_stc_name} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
					else
						if [ $m = "inforcheck" ] || [ $m = "bioscheck" ];then
							show_warning_message "###############################warning#####################################"
							show_warning_message "Current station is ${current_stc_name}! $m is not a true fail please change the tester and retest!!!" 
							show_warning_message "if still $m fail please call TE to check wareconn test configuration!!!"
						else
							show_warning_message "###############################warning#####################################" 
							show_warning_message "Current station is ${current_stc_name}! it is not a true fail please change the tester and retest!!!"
						fi
					fi	

				fi		
			else
				ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_${current_stc_name}*" 2>/dev/null)
				if [ -n "$ress" ];then
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${current_stc_name} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}	
				else
					if [ $m = "inforcheck" ] || [ $m = "bioscheck" ];then
						show_warning_message "###############################warning#####################################"
						show_warning_message "Current station is ${current_stc_name}! $m is not a true fail please change the tester and retest!!!" 
						show_warning_message "if still $m fail please call TE to check wareconn test configuration!!!"
					else
						show_warning_message "###############################warning#####################################"
						show_warning_message "Current station is ${current_stc_name}! it is not a true fail please change the tester and retest!!!"
					fi
				fi	
			fi	
		fi
	else
		test_item="inforcheck bioscheck ${current_stc_name}"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${Tstation}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${Tstation}*" 2>/dev/null)
				if [ -n "$resf" ] && [ -n "$resc" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				elif [ -n "$resf" ] ; then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				elif [ -n "$resc" ];then
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				else
					show_fail_message "${Tstation} can't find pass log please check"
				fi	
			else
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${Tstation}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					show_pass
					if [ "$cont" = "true" ];then
						sleep 10
						reboot
					fi
				else
					show_fail_message "${Tstation} can't find pass log please check"
				fi	
			fi	
		else
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${Tstation}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${Tstation}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${Tstation} PASS
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					check_station ${Scan_Lower_SN} ${Tstation} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
				elif [ -n "$resc" ];then	
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
					check_station ${Scan_Lower_SN} ${Tstation} PASS
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${Tstation} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
				else
					ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_${Tstation}*" 2>/dev/null)
					resl=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_F_${Tstation}*" 2>/dev/null)
					if [ -n "$ress" ] && [ -n "$resl" ];then
						Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
						check_station ${Scan_Upper_SN} ${Tstation} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
						Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC} ${Output_Lower_699PN}
						check_station ${Scan_Lower_SN} ${Tstation} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
					else
						if [ $m = "inforcheck" ] || [ $m = "bioscheck" ];then
							show_warning_message "###############################warning#####################################" 
							show_warning_message "Current station is ${Tstation}! $m is not a true fail please change the tester and retest!!!" 
							show_warning_message "if still $m fail please call TE to check wareconn test configuration!!!"
						else
							show_warning_message "###############################warning#####################################" 
							show_warning_message "Current station is ${Tstation}! it is not a true fail please change the tester and retest!!!"
						fi
					fi	
				fi		
			else
				ress=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_F_${Tstation}*" 2>/dev/null)
				if [ -n "$ress" ];then
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC} ${Output_Upper_699PN}
					check_station ${Scan_Upper_SN} ${Tstation} FAIL ${FactoryErrorCode} ${FactoryErrorMsg}
				else
					if [ $m = "inforcheck" ] || [ $m = "bioscheck" ];then
						show_warning_message "###############################warning#####################################" 
						show_warning_message "Current station is ${Tstation}! $m is not a true fail please change the tester and retest!!!" 
						show_warning_message "if still $m fail please call TE to check wareconn test configuration!!!"
					else
						show_warning_message "###############################warning#####################################"
						show_warning_message "Current station is ${Tstation}! it is not a true fail please change the tester and retest!!!"
					fi
				fi	
			fi	
		fi	
	fi
else                         ##### |||||| ------------------------ Offline / Legacy mode ---------------------------|||||| #####
	cd $mods
	if [ $station = "FLA2" ];then
		Tstation="FLA"
	elif [ $station = "IST2" ];then
		Tstation="IST"
	elif [ $station = "CHIFLASH" ];then
		Tstation="CHI"
	else
		Tstation=$current_stc_name
	fi	
	if [ ${station} = "FT" ];then
		test_item="BAT BIT FCT FPF"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_FPF*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_FPF*" 2>/dev/null)		
				if [ -n "$resf" ] && [ -n "$resc" ];then
					Upload_Log ${Scan_Upper_SN} PASS
					Upload_Log ${Scan_Lower_SN} PASS
					# show_pass
					# #sleep 20
					# #reboot
				elif [ -n "$resf" ] ; then
					Upload_Log ${Scan_Upper_SN} PASS
					# # show_pass
					# #sleep 20
					# #reboot
				else
					Upload_Log ${Scan_Lower_SN} PASS
					# show_pass
					# #sleep 20
					# #reboot
				fi			
			else
				Upload_Log ${Scan_Upper_SN} PASS
				# show_pass
				# #sleep 20
				# #reboot
			fi	
		else
			if [ $testqty = "2" ];then
				Upload_Log ${Scan_Upper_SN} FAIL
				Upload_Log ${Scan_Lower_SN} FAIL
				# show_fail
			else
				Upload_Log ${Scan_Upper_SN} FAIL
				# show_fail
			fi	
		fi
	elif [ ${station} = "FLA" ];then
		test_item="rwcsv FLA"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_pass
			# show_pass_message "FLA station need poweroff and turn off/on 54v PSU as well"	
		else
			Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_fail			
		fi
	elif [ ${station} = "FLA2" ];then
		test_item="rwcsv FLA2"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_pass
			# show_pass_message "FLA station need poweroff and turn off/on 54v PSU as well"	
		else
			Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_fail			
		fi		
	elif [ ${station} = "FLB" ];then
		test_item="rwcsv FLB"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_pass
			# show_pass_message "FLB station need poweroff and turn off/on 54v PSU as well"	
		else
			Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_fail	
		fi
	elif [ ${station} = "FLC" ];then
		test_item="rwcsv FLC"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_pass
			# show_pass_message "FLC station need poweroff and turn off/on 54v PSU as well"	
		else
			Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
			# show_fail	
		fi		
	elif [ ${station} = "CHIFLASH" ];then ####for clear BBX station### 2024-04-26
		test_item="rwcsv CHIFLASH"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
		else
			Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
		fi
	elif [ ${station} = ${Tstation} ];then
		test_item="${station}"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${station}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${station}*" 2>/dev/null)
				if [ -n "$resf" ] && [ -n "$resc" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				elif [ -n "$resf" ] ; then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				else
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				fi	
			else
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
				# show_pass
				# #sleep 20
				# #reboot
			fi	
		else
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${station}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${station}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_fail
				elif [ -n "$resc" ];then	
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					# show_fail
				else
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_fail
				fi		
			else
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
				# show_fail
			fi	
		fi
	else
		test_item="${station}"
		run_command "$test_item"
		if [ $? -eq 0 ];then
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${Tstation}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${Tstation}*" 2>/dev/null)
				if [ -n "$resf" ] && [ -n "$resc" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				elif [ -n "$resf" ] ; then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				else
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_pass
					# #sleep 20
					# #reboot
				fi	
			else
				Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
				# show_pass
				# #sleep 20
				# #reboot
			fi	
		else
			if [ $testqty = "2" ];then
				resf=$(find $LOGFILE/ -name "*${Scan_Upper_SN}_P_${Tstation}*" 2>/dev/null)
				resc=$(find $LOGFILE/ -name "*${Scan_Lower_SN}_P_${Tstation}*" 2>/dev/null)
				if [ -n "$resf" ];then
					Upload_Log ${Scan_Upper_SN} PASS ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_fail
				elif [ -n "$resc" ];then	
					Upload_Log ${Scan_Lower_SN} PASS ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					# show_fail
				else
					Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
					Upload_Log ${Scan_Lower_SN} FAIL ${Input_Lower_Eboard} ${Input_Lower_ESN} ${Input_Lower_HSC}
					# show_fail
				fi		
			else
				Upload_Log ${Scan_Upper_SN} FAIL ${Input_Upper_Eboard} ${Input_Upper_ESN} ${Input_Upper_HSC}
				# show_fail
			fi	
		fi	
		
	fi
fi	
	
#run_command ${current_stc_name}

#./$mods/"${current_stc_name}".sh


}

####----------------------------------------------upload log to logserver----------------------------------------------------#####
#                                                                                                                                #
#   This upload log() generates the final test log file, name it using a strict convention, upload/copy it to the log server,    #
#   then Notify wareconn that the test is ended (Online mode)                                                                    #
#                                                                                                                                #
#--------------------------------------------------------------------------------------------------------------------------------#

#####----------------------------------------------------------#####
#                                                                  #
#       run_command                                                #
#            ↓                                                     #
#        raw logs created (_P_ / _F_)                              #
#            ↓                                                     #
#        Run_Diag checks raw logs                                  #
#            ↓                                                     #
#        Upload_Log called                                         #
#            ↓                                                     #
#        analysis_log extracts errors                              #
#            ↓                                                     #
#        final log created:                                        #
#            SN_STATION_TIME_PASS.log                              #
#                ↓                                                 #
#            all logs uploaded                                     #
#                ↓                                                 #
#           Wareconn notified                                      #
#                                                                  #
#####----------------------------------------------------------#####

Upload_Log()
{
if [ $testqty = 2 ]; then
	Final_status="DUAL Board Final status"
else
	Final_status="Final status"
fi

if [ "$Run_Mode" != "0" ];then
	current_stc_name=$station	
fi	

end_time=`date +"%Y%m%d_%H%M%S"`
EndTesttime=`date +"%Y%m%d%H%M%S"`
filename=$1_"${current_stc_name}"_"$end_time"_$2.log
analysis_log $1 $2 $3 $4 $5

# Parameter maps as $1 --> SN, $2 --> Result(pass/fail), $3-$5 --> Board metadata, $6 --> 699 PN 

cd $LOGFILE
echo "${PROJECT} L5 Functional Test" >"${filename}"
echo "${diag_name} (config version: ${CFG_VERSION})" >>"${filename}"
echo "============================================================================" >>"${filename}"
echo "Start time              :$start_time" >>"${filename}"
echo "End time                :$(date '+%F %T')" >>"${filename}"
echo "Part number             :${Input_Upper_PN}" >>"${filename}"
echo "699Part number          :${6}" >>"${filename}"
echo "Serial number           :${1}" >>"${filename}"
echo "operator_id             :`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`" >>"${filename}"
echo "fixture_id              :`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`" >>"${filename}"
echo "VBIOS                   :$BIOS_VER" >> "${filename}"
echo "FactoryErrorCode        :$FactoryErrorCode" >> "${filename}"
echo "FactoryErrorMsg         :$FactoryErrorMsg" >> "${filename}"
echo " " >>"${filename}"
echo "============================================================================" >>"${filename}"
echo "$Final_status: ${2}" >> "${filename}"
echo "****************************************************************************" >>"${filename}"
echo "FUNCTIONAL TESTING" >>"${filename}"
echo "****************************************************************************" >>"${filename}"

cat $LOGFILE/log.txt | tr -d "\000" >>"${filename}"

## upload test log to log server
if [ -d ${Logs_Path}/$PROJECT ]; then
	[ ! -d ${Logs_Path}/$PROJECT/${Input_Upper_PN} ] && mkdir ${Logs_Path}/$PROJECT/${Input_Upper_PN}
	cp -rf *$1* ${Logs_Path}/$PROJECT/${Input_Upper_PN}
	cp -rf *$1* ${Local_Logs}
	rm -rf *$1*	
else
	Input_Server_Connection
	if [ -d ${Logs_Path}/$PROJECT ]; then
		[ ! -d ${Logs_Path}/$PROJECT/${Input_Upper_PN} ] && mkdir ${Logs_Path}/$PROJECT/${Input_Upper_PN}
		cp -rf *$1* ${Logs_Path}/$PROJECT/${Input_Upper_PN}
		cp -rf *$1* ${Local_Logs}
		rm -rf *$1*
	else
		show_fail_message "show_fail_message Mounting log server fail."
		exit 1 
	fi	
	
fi	
####report test result to wareconn

if [ "$Run_Mode" = "0" ];then
	Output_Wareconn_Serial_Number_RestAPI_Mode_End $1
fi	

}

#####-----------------------------------------------------------------------------------------------#####
#                                                                                                       #
#   Run one or more test modules, record their output, and return PASS/FAIL to the caller.              #
#    Run_Diag                                                                                           #
#        ↓                                                                                              #
#    run_command                                                                                        #
#        ↓                                                                                              #
#    module.sh execution                                                                                #
#        ↓                                                                                              #
#    exit code decides PASS/FAIL                                                                        #
#        ↓                                                                                              #
#    log.txt created                                                                                    #
#        ↓                                                                                              #
#    Run_Diag searches raw logs (_P_/_F_)                                                               #
#        ↓                                                                                              #
#    Upload_Log wraps everything                                                                        #
#                                                                                                       #
#####-----------------------------------------------------------------------------------------------#####

run_command()
{
    for m in $1; do
        echo $m | grep -i "untest" > /dev/null 2>&1
        [ $? -eq 0 ] && continue

        echo -e "\033[32m Begin $m module Test\033[0m"
        echo " " | tee -a $LOGFILE/log.txt
        date +"<Info message>: $m - start time: %F %T" | tee -a $LOGFILE/log.txt 
        cd $mods
        ./$m.sh 
        if [ $? -ne 0 ]; then
            echo "$m module Test ------------ [ FAIL ]" | tee -a $LOGFILE/log.txt
            color "$m module test" FAIL
            date +"<Info message>: $m - end time: %F %T" | tee -a $LOGFILE/log.txt
			Fail_Module=$m
            echo " "
            echo " " | tee -a $LOGFILE/log.txt 
            return 1
        else
            echo "$m module Test ----------- [ PASS ]" | tee -a $LOGFILE/log.txt
            color "$m module test" PASS
            date +"<Info message>: $m - end time: %F %T" | tee -a $LOGFILE/log.txt 
            echo " "
            echo " " | tee -a $LOGFILE/log.txt
        fi
    done
	
}

############-------------------------------------------------------------------------------------##############
#                                                                                                             #
#   get_information() is essentially the configuration loader + station normalizer for the diag framework.    #
#   Load everything needed to run this station correctly.                                                     #
#                                                                                                             #
#        get_information                                                                                      #
#                ↓                                                                                            #
#        Loads platform + station + versions                                                                  #
#                ↓                                                                                            #
#        Normalizes station identity                                                                          #
#                ↓                                                                                            #
#        Everything else uses these globals                                                                   #
#                                                                                                             #
############-------------------------------------------------------------------------------------##############

get_information()
{
    MACHINE=$(get_config "MACHINE")
    Input_Upper_PN=$(get_config "part_number")
    current_stc_name=$(get_config "current_stc_name")
    NVFLASH_VER=$(get_config "NVFLAH_VER")
    NVINFOROM=$(get_config "NVINFOROM")
    HEAVEN_VER=$(get_config "HEAVEN")
    BIOS_NAME=$(get_config "BIOS1_NAME")
    BIOS_VER=$(get_config "BIOS1_VER")
    Input_Script=$(get_config "SCRIPT_VER")
    operator_id="`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`"
    fixture_id="`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`"

    if [ $current_stc_name = "FLA2" ];then
        Tstation="FLA"
    elif [ $current_stc_name = "IST2" ];then
        Tstation="IST"
    elif [ $current_stc_name = "CHIFLASH" ];then
        Tstation="CHI"	
    else
        Tstation=$current_stc_name
    fi
}

analysis_sta()
{
if [ $Run_Mode = "0" ];then #### 2024-06-15

	cd $mods/cfg/
	cp  ${Output_Upper_SN}.RSP cfg.ini
	get_information
	script_check
	if [ "$current_stc_name" = "OQA" ] ; then 
		diag_name=$(get_config "Diag2")
		diag_VER=$diag_name.tar.gz
		if [ -f $mods/$diag_VER ]; then
			Run_Diag
		else
			DownLoad
			Run_Diag			
		fi
		
	elif [ "$current_stc_name" = "CHIFLASH" ];then ###for clear BBX station## 2024-04-26
		diag_name=$(get_config "Diag3")
		diag_VER=$diag_name.tar.gz
		#echo $diag_VER
		#pause
		if [ -f $mods/$diag_VER ]; then
			Run_Diag
		else
			DownLoad
			Run_Diag
		
		fi
		
	elif [[ "${list_st[@]}" =~ "$current_stc_name" ]];then
		diag_name=$(get_config "Diag1")
		diag_VER=$diag_name.tar.gz
		#echo $diag_VER
		#pause
		if [ -f $mods/$diag_VER ]; then
			Run_Diag
		else
			DownLoad
			Run_Diag
		
		fi
	elif [[ "${list_stn[@]}" =~ "$current_stc_name" ]]; then
		cont="false"
		show_fail_message "Current Station is $current_stc_name, need more spare parts Please check!!!"
		pause
		diag_name=$(get_config "Diag1")
		diag_VER=$diag_name.tar.gz
		if [ -f $mods/$diag_VER ]; then
			Run_Diag
		else
			DownLoad
			Run_Diag
		fi	
	else
		show_fail_message "Current Station is $current_stc_name not test station"
		exit 1 
		
	fi
else
	cd $mods/cfg/
	cp  ${Output_Upper_SN}.RSP cfg.ini
	get_information
	script_check
	#read -p "Please Input station :" station
	#echo $station
	#pause
	#if [[ "$list_st_all" =~ "$station" ]];then
		if [ $station = "OQA" ];then
			diag_name=$(get_config "Diag2")
			diag_VER=$diag_name.tar.gz
			if [ ! -f $mods/$diag_VER ];then
				DownLoad
				Run_Diag
			else
				Run_Diag
			fi
		elif [ $station = "CHIFLASH" ];then
			diag_name=$(get_config "Diag3")
			diag_VER=$diag_name.tar.gz
			if [ ! -f $mods/$diag_VER ];then
				DownLoad
				Run_Diag
			else
				Run_Diag
			fi
		else
			diag_name=$(get_config "Diag1")
			diag_VER=$diag_name.tar.gz
			if [ ! -f $mods/$diag_VER ];then
				DownLoad
				Run_Diag
			else
				Run_Diag
			fi
		fi
	#else
		#show_fail_message "station wrong please check!!!"
		#exit 1
	#fi	
fi		

}

#####-----------------------------------------------------------------------------------------------------------------#####
#                                                                                                                         #
#   The function's goal is to record the start time of a test for perticular SN and station,                              #
#   create log file documenting the test metadata,                                                                        #
#   Upload this log to the log server (and local backup) immideiately so there is a record that testing has started.      #
#                                                                                                                         #
#####-----------------------------------------------------------------------------------------------------------------#####

upload_start_log()
{
    # Capture a time stamp
    start_log_time=`date +"%Y%m%d_%H%M%S"`
	StartTestTime=`date +"%Y%m%d%H%M%S"`

    # Build the log file name 
    filename="$1"_"${current_stc_name}"_"$start_log_time"_"START".log
    
    # Create the log content
	cd $LOGFILE
    echo "${PROJECT} L5 Functional Test" >"${filename}"
    echo "${diag_name} (config version: ${CFG_VERSION})" >>"${filename}"
    echo "============================================================================" >>"${filename}"
    echo "Start time              :$start_time" >>"${filename}"
    echo "Part number             :${Input_Upper_PN}" >>"${filename}"
    echo "Serial number           :${1}" >>"${filename}"
    echo "operator_id             :`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`" >>"${filename}"
    echo "fixture_id              :`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`" >>"${filename}"

    ## upload test log to log server
	if [ -d ${Logs_Path}/$PROJECT ]; then
		[ ! -d ${Logs_Path}/$PROJECT/${Input_Upper_PN} ] && mkdir ${Logs_Path}/$PROJECT/${Input_Upper_PN}
		cp -rf *$1* ${Logs_Path}/$PROJECT/${Input_Upper_PN}
		cp -rf *$1* ${Local_Logs}
		rm -rf *$1*	
	else
		Input_Server_Connection
		if [ -d ${Logs_Path}/$PROJECT ]; then
			[ ! -d ${Logs_Path}/$PROJECT/${Input_Upper_PN} ] && mkdir ${Logs_Path}/$PROJECT/${Input_Upper_PN}
			cp -rf *$1* ${Logs_Path}/$PROJECT/${Input_Upper_PN}
			cp -rf *$1* ${Local_Logs}
			rm -rf *$1* 
		else
			show_fail_message "show_fail_message Mounting log server fail."
			exit 1 
		fi	
		
	fi	

}

#####wareconn control script version##################################################################

#####-----------------------------------------------------------------------------------------------------------------#####
#                                                                                                                         #
#  Script_Check() : --> self-update + Integrity check                                                                     #
#   The scriipt version running on the tester matches the version required by the configuration.                          #
#   The file content is identical to the version stored on the diag server.                                               #
#   If NOT:                                                                                                               #
#       - Automatically updates the script                                                                                #
#       - Reboots the tester so the  new script takes effect                                                              #
#   (In short: Always run the correct, approved script version)                                                           #
#                                                                                                                         #
#####-----------------------------------------------------------------------------------------------------------------#####

script_check()
{
    # Calculate local script checksum
	local_sum=$(md5sum /mnt/nv/$Script_File | awk '{print $1}')

    # Calculate server script checksum
	server_sum=$(md5sum ${Diag_Path}/${Input_Script}_${Script_File} | awk '{print $1}')
	
    # Version + integrity comparison
	if [ "${Script_VER}" = "${Input_Script}" ] && [ "$local_sum" = "$server_sum" ];then
        #Script is valid ( no update needed ) , Test continues normally
		echo "Script Version is ${Script_VER}"
	else
        # Script mismatch or corruption detected
		echo "Script Version is ${Script_VER}"
		if [ -f ${Diag_Path}/${Input_Script}_${Script_File} ];then
			cp -rf ${Diag_Path}/${Input_Script}_${Script_File} /mnt/nv/$Script_File
			sleep 15
			reboot
		else
			Input_Server_Connection
			if [ -f ${Diag_Path}/${Input_Script}_${Script_File} ];then
				cp -rf ${Diag_Path}/${Input_Script}_${Script_File} /mnt/nv/$Script_File
				sleep 15
				reboot
			else
				show_fail_msg "not exsit script please check"
				exit 1
			fi
		fi		
	fi	


}

######################################################################################################

#####-----------------------------------------------------------------------------------------------------------------#####
#                                                                                                                         #
#   Analysis_log() : --> Log normalization + factory report builder                                                       #
#       - parses raw diag output                                                                                          #
#       - Extracts Factory required fields (Error codes, Temperature/ Fan speed)                                          #
#       - Create the factory log                                                                                          #
#       - Raw diag log --> factory complaiant final log                                                                   #
#                                                                                                                         #
#####-----------------------------------------------------------------------------------------------------------------#####

analysis_log()
{
FactoryErrorCode=""
FactoryErrorMsg=""

cd $LOGFILE

if [ $current_stc_name = $Tstation ];then
	LogName=$(find $LOGFILE/ -name "*$1_*_${current_stc_name}*.tsg" 2>/dev/null)
	LogNamea=$(find $LOGFILE/ -name "*$1_*_${current_stc_name}*.log" 2>/dev/null)
	if [ -n "$LogName" ];then
		if [ "$2" = "PASS" ];then
			FactoryErrorCode="0"
		else	
			FactoryErrorCode=$(jq -r '.[] | select(.tag == "FactoryErrorCode") | .value' "$LogName")
		fi	
		FactoryErrorMsg=$(jq -r '.[] | select(.tag == "FactoryErrorMsg") | .value' "$LogName")
		HOST_MAC_ADDR=$(jq -r '.[] | select(.tag == "HOST_MAC_ADDR") | .value' "$LogName")
		PORT_ADDRESS=$(jq -r '.[] | select(.tag == "PORT_ADDRESS") | .value' "$LogName")
		Bin=$(jq -r '.[] | select(.tag == "Bin") | .value' "$LogName")
		#VBIOS_VERSION=$(jq -r '.[] | select(.tag == "VBIOS_VERSION") | .value' "$LogName")
		name=$(find -name "*$1*" -type d)
		filenames=$(basename $name)
		outputfile=$(find $filenames -name "output.txt" )
		tasfile=$(find $filenames -name "tas.txt")
		FAN_RPM_2_6_3_4=$(grep -m 1 "FAN_RPM/2/6/3/4" $tasfile | awk -F '|' '{print$2}')
		Inlet_Temp=$(grep -m 1 "Inlet_Temp" $tasfile | awk -F '|' '{print$2}')
		if [ "$FAN_RPM_2_6_3_4" = "" ];then
			FAN_RPM_2_6_3_4="NA"
		fi
		if [ "$Inlet_Temp" = "" ];then
			Inlet_Temp="NA"
		fi	
		outputpath=$(pwd)/$outputfile
		cat $tasfile > $filenames.log
		echo "" >> $filenames.log
		echo ""  >> $filenames.log
		echo "file:$outputpath" >> $filenames.log
		echo ""  >> $filenames.log
		cat $outputfile >> $filenames.log
		echo ""  >> $filenames.log
		echo ""  >> $filenames.log
		
		echo "$3:$4" >> $filenames.log ##from wareconn
		echo "" >> $filenames.log
		echo "Factory Information" >> $filenames.log
		echo "Monitor SN:" >> $filenames.log ##??
		echo "HardDisk SN:" >> $filenames.log ##??
		echo "HardDisk Health:N/A" >> $filenames.log
		echo "Power-On Time Count:" >> $filenames.log ##??
		echo "Drive Power Cycle Count:" >> $filenames.log ##??
		echo "CPUID:`dmidecode -t 4 | grep "ID" | awk -F ':' '{print $2}'`" >> $filenames.log 
		echo "Brand String: `dmidecode -t 4 | grep "Version" | awk -F ':' '{print $2}'` " >> $filenames.log 
		echo "Mac Address:$HOST_MAC_ADDR" >> $filenames.log ##from tsg log
		echo "DiagVer:${diag_name}" >> $filenames.log
		echo "PCIE Riser Card ID:NONE" >> $filenames.log ##??
		echo "BrdSN:$1" >> $filenames.log
		echo "FLAT ID:`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames.log
		echo "Routing:${current_stc_name}" >> $filenames.log
		echo "FOX_Routing:${current_stc_name}" >> $filenames.log
		echo "PN:${Input_Upper_PN}" >> $filenames.log
		echo "BIOS:$BIOS_VER" >> $filenames.log
		echo "BIN:$Bin" >> $filenames.log ##??
		echo "Error Code:$FactoryErrorCode" >> $filenames.log ##use factory error code 
		echo "StartTestTime:$StartTestTime" >> $filenames.log
		echo "EndTesttime:$EndTesttime" >> $filenames.log
		echo "Operator:`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames.log
		echo "System Ver:`cat /etc/centos-release`" >> $filenames.log 
		echo "SFC:YES" >> $filenames.log
		echo "PortWell-B SN:`dmidecode -t 1 | grep "Serial Number" | awk -F ':' '{print $2}'`" >> $filenames.log ##ipmitool 
		echo "Hotplug Status:YES" >> $filenames.log ##TJ all testers enable Hotplug
		echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames.log ##from tsg log
		echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames.log ##from tsg log
		echo "QR_CODE: N/A" >> $filenames.log ##??
		echo "HS_QR_CODE:$5" >> $filenames.log ##??
		echo "FAN_RPM_2_6_3_4:$FAN_RPM_2_6_3_4" >> $filenames.log
		echo "Inlet_Temp:$Inlet_Temp" >> $filenames.log
		echo "" >> $filenames.log
		echo "" >> $filenames.log
		echo "****END****" >> $filenames.log
	elif [ -n "$LogNamea" ];then
		if [ "$2" = "PASS" ];then
			FactoryErrorCode="0"
		else	
			FactoryErrorCode=$(grep "FactoryErrorCode        :" $LogNamea | awk -F':' '{print $2}' | tr -d ' ')
		fi
		FactoryErrorMsg="NA"
		filenames=$(find $LOGFILE/ -name "FXTJ_NA_${Input_Upper_PN}_$1_*.log" 2>/dev/null)
		if [ -n "$filenames" ];then
			echo "$Eboard:$Eboard_SN" >> $filenames ##from wareconn
			echo "" >> $filenames
			echo "Factory Information" >> $filenames
			echo "Monitor SN:" >> $filenames ##??
			echo "HardDisk SN:" >> $filenames ##??
			echo "HardDisk Health:N/A" >> $filenames
			echo "Power-On Time Count:" >> $filenames ##??
			echo "Drive Power Cycle Count:" >> $filenames ##??
			echo "CPUID:`dmidecode -t 4 | grep "ID" | awk -F ':' '{print $2}'`" >> $filenames 
			echo "Brand String: `dmidecode -t 4 | grep "Version" | awk -F ':' '{print $2}'` " >> $filenames
			echo "Mac Address:$HOST_MAC_ADDR" >> $filenames ##from tsg log
			echo "DiagVer:${diag_name}" >> $filenames
			echo "PCIE Riser Card ID:NONE" >> $filenames ##??
			echo "BrdSN:$1" >> $filenames
			echo "FLAT ID:`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames
			echo "Routing:${current_stc_name}" >> $filenames
			echo "FOX_Routing:${current_stc_name}" >> $filenames
			echo "PN:${Input_Upper_PN}" >> $filenames
			echo "BIOS:$BIOS_VER" >> $filenames
			echo "BIN:$Bin" >> $filenames ##??
			echo "Error Code:$FactoryErrorCode" >> $filenames ##use factory error code 
			echo "StartTestTime:$StartTestTime" >> $filenames
			echo "EndTesttime:$EndTesttime" >> $filenames
			echo "Operator:`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames
			echo "System Ver:`cat /etc/centos-release`" >> $filenames 
			echo "SFC:YES" >> $filenames
			echo "PortWell-B SN:`dmidecode -t 1 | grep "Serial Number" | awk -F ':' '{print $2}'`" >> $filenames ##ipmitool 
			echo "Hotplug Status:YES" >> $filenames ##TJ all testers enable Hotplug
			echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames ##from tsg log
			echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames ##from tsg log
			echo "QR_CODE: N/A" >> $filenames ##??
			echo "HS_QR_CODE:$HS_QR_CODE" >> $filenames ##??
			echo "" >> $filenames
			echo "" >> $filenames
			echo "****END****" >> $filenames
		else
			show_fail_message "Can't find the analysis Log"
		fi	
	else
		show_fail_message "Can't find the analysis Log"
	fi	
else
		
	LogName=$(find $LOGFILE/ -name "*$1_*_${Tstation}*.tsg" 2>/dev/null)
	if [ -n "$LogName" ];then
		if [ "$2" = "PASS" ];then
			FactoryErrorCode="0"
		else	
			FactoryErrorCode=$(jq -r '.[] | select(.tag == "FactoryErrorCode") | .value' "$LogName")
		fi	
		FactoryErrorMsg=$(jq -r '.[] | select(.tag == "FactoryErrorMsg") | .value' "$LogName")
		HOST_MAC_ADDR=$(jq -r '.[] | select(.tag == "HOST_MAC_ADDR") | .value' "$LogName")
		PORT_ADDRESS=$(jq -r '.[] | select(.tag == "PORT_ADDRESS") | .value' "$LogName")
		Bin=$(jq -r '.[] | select(.tag == "Bin") | .value' "$LogName")
		#VBIOS_VERSION=$(jq -r '.[] | select(.tag == "VBIOS_VERSION") | .value' "$LogName")
		name=$(find -name "*$1*" -type d)
		filenames=$(basename $name)
		outputfile=$(find $filenames -name "output.txt" )
		tasfile=$(find $filenames -name "tas.txt")
		FAN_RPM_2_6_3_4=$(grep -m 1 "FAN_RPM/2/6/3/4" $tasfile | awk -F '|' '{print$2}')
		Inlet_Temp=$(grep -m 1 "Inlet_Temp" $tasfile | awk -F '|' '{print$2}')
		if [ "$FAN_RPM_2_6_3_4" = "" ];then
			FAN_RPM_2_6_3_4="NA"
		fi
		if [ "$Inlet_Temp" = "" ];then
			Inlet_Temp="NA"
		fi
		outputpath=$(pwd)/$outputfile
		cat $tasfile > $filenames.log
		echo "" >> $filenames.log
		echo ""  >> $filenames.log
		echo "file:$outputpath" >> $filenames.log
		echo ""  >> $filenames.log
		cat $outputfile >> $filenames.log
		echo ""  >> $filenames.log
		echo ""  >> $filenames.log
		
		echo "$3:$4" >> $filenames.log ##from wareconn
		echo "" >> $filenames.log
		echo "Factory Information" >> $filenames.log
		echo "Monitor SN:" >> $filenames.log ##??
		echo "HardDisk SN:" >> $filenames.log ##??
		echo "HardDisk Health:N/A" >> $filenames.log
		echo "Power-On Time Count:" >> $filenames.log ##??
		echo "Drive Power Cycle Count:" >> $filenames.log ##??
		echo "CPUID:`dmidecode -t 4 | grep "ID" | awk -F ':' '{print $2}'`" >> $filenames.log 
		echo "Brand String: `dmidecode -t 4 | grep "Version" | awk -F ':' '{print $2}'` " >> $filenames.log 
		echo "Mac Address:$HOST_MAC_ADDR" >> $filenames.log ##from tsg log
		echo "DiagVer:${diag_name}" >> $filenames.log
		echo "PCIE Riser Card ID:NONE" >> $filenames.log ##??
		echo "BrdSN:$1" >> $filenames.log
		echo "FLAT ID:`grep "fixture_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames.log
		echo "Routing:${current_stc_name}" >> $filenames.log
		echo "FOX_Routing:${current_stc_name}" >> $filenames.log
		echo "PN:${Input_Upper_PN}" >> $filenames.log
		echo "BIOS:$BIOS_VER" >> $filenames.log
		echo "BIN:$Bin" >> $filenames.log ##??
		echo "Error Code:$FactoryErrorCode" >> $filenames.log ##use factory error code 
		echo "StartTestTime:$StartTestTime" >> $filenames.log
		echo "EndTesttime:$EndTesttime" >> $filenames.log
		echo "Operator:`grep "operator_id=" $SCANFILE |sed 's/.*= *//'`" >> $filenames.log
		echo "System Ver:`cat /etc/centos-release`" >> $filenames.log 
		echo "SFC:YES" >> $filenames.log
		echo "PortWell-B SN:`dmidecode -t 1 | grep "Serial Number" | awk -F ':' '{print $2}'`" >> $filenames.log ##ipmitool 
		echo "Hotplug Status:YES" >> $filenames.log ##TJ all testers enable Hotplug
		echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames.log ##from tsg log
		echo "0SN_From_SCAN,,relates_slots,$PORT_ADDRESS" >> $filenames.log ##from tsg log
		echo "QR_CODE: N/A" >> $filenames.log ##??
		echo "HS_QR_CODE:$5" >> $filenames.log ##??
		echo "FAN_RPM_2_6_3_4:$FAN_RPM_2_6_3_4" >> $filenames.log
		echo "Inlet_Temp:$Inlet_Temp" >> $filenames.log		
		echo "" >> $filenames.log
		echo "" >> $filenames.log
		echo "****END****" >> $filenames.log
	
	else
		show_fail_message "Can't find the analysis Log"
	fi
fi	


}

####install tool########################################################################################

#####-----------------------------------------------------------------------------------------------------------------#####
#                                                                                                                         #
#   Update() is a bootstrap safety net.                                                                                   #
#       It ensures that time sync and JSON parsing tools exist before any factory testing happens.                        #
#                                                                                                                         #
#           Check if ntpdate exists                                                                                       #
#               ├─ If not → install from diag server                                                                      #
#           Check if jq exists                                                                                            #
#               ├─ If not → copy binary from diag server                                                                  #
#                                                                                                                         #
#####-----------------------------------------------------------------------------------------------------------------#####

update()
{

####ntpdate install###
if [ ! -f /usr/sbin/ntpdate ];then  
	if [ -f $Diag_Path/updates/ntpdate-4.2.6p5-28.el7.centos.x86_64.rpm ];then
		cp $Diag_Path/updates/ntpdate-4.2.6p5-28.el7.centos.x86_64.rpm $mods
		rpm -Uvh $mods/ntpdate-4.2.6p5-28.el7.centos.x86_64.rpm
	else
		show_fail_message "update files ntpdate not exist !!!"
		exit 1
	fi	
fi

####jq install####
		
if [ ! -f /usr/bin/jq ];then
	if [ -f $Diag_Path/updates/jq ];then
		cp $Diag_Path/updates/jq /usr/bin
	else
		show_fail_message "update files ntpdate not exist !!!"
		exit 1
	fi	
fi
}

########################################################################################################

#####-----------------------------------------------------------------------------------------------------------------#####
#                                                                                                                         #
#   This is a bridge between the tester and Wareconn.                                                                     #    
#   It queries Wareconn by Serial Number and pulls live manufacturing data.                                               #
#            Where the unit came from                                                                                     #
#                                                                                                                         #
#            What station it’s currently at                                                                               #
#                                                                                                                         #
#            What board / fixture is attached                                                                             #
#                                                                                                                         #
#            Whether the unit is allowed to be tested                                                                     #
#                                                                                                                         #
#            What part number and service state apply                                                                     #
#                                                                                                                         #
#            Without this data:                                                                                           #
#                                                                                                                         #
#            Wrong station tests could run                                                                                #
#                                                                                                                         #
#            Wrong config / diag could be selected                                                                        #
#                                                                                                                         #
#            Invalid units could be tested                                                                                #
#                                                                                                                         #
#####-----------------------------------------------------------------------------------------------------------------#####

Input_Wareconn_Serial_Number_RestAPI_Mode_ItemInfo()
{

station_name=""
Eboard_SN=""
Eboard=""
HS_QR_CODE=""
Input_RestAPI_Message=""
part_number=""
service_status=""
board_699pn=""
###API

##get_token#############################

# echo "get token from wareconn API"
# max_attempts=3
# attempt=1
# sleep_time=5
# timeout=60
# while [ $attempt -le $max_attempts ]; do
    # show_warning_message "connecting API $attempt times (timeout: ${timeout}s)..."   
    # Input_RestAPI_Message=$(curl -m 60 -k "https://$API_IP:443/api/v1/Oauth/token?${ID}&${SECRET}&${TYPE}")
    # curl_exit_code=$?

    # if [ $curl_exit_code -eq 0 ]; then
        # break
    # fi

    # if [ $attempt -lt $max_attempts ]; then
        # sleep $sleep_time
    # fi

    # ((attempt++))
# done
# if [ -n "$Input_RestAPI_Message" ] && echo "$Input_RestAPI_Message" | jq -e '.code == 0' > /dev/null; then
	# token=$(echo "$Input_RestAPI_Message" | awk -F '"' '{print $10 }')
	# show_pass_message "get_token successful:$token"	
# else
	# show_fail_message "$Input_RestAPI_Message"
	# show_fail_message "get token Fail Please check net cable or call TE"
	# exit 1
# fi

##get_information from wareconn#########
echo "get data information from wareconn"

max_attempts=3
attempt=1
sleep_time=5
timeout=60
while [ $attempt -le $max_attempts ]; do
    show_warning_message "connecting API $attempt times (timeout: ${timeout}s)..."   
    Input_RestAPI_Message=$(curl -m 60 -k "$iurl?serial_number=$1") ####add parameters type 2024-05-07 
    curl_exit_code=$?

    if [ $curl_exit_code -eq 0 ]; then
        break
    fi

    if [ $attempt -lt $max_attempts ]; then
        sleep $sleep_time
    fi

    ((attempt++))
done
#echo $Input_RestAPI_Message
#pause
if [ -n "$Input_RestAPI_Message" ] && echo "$Input_RestAPI_Message" | jq -e '.code == 0' > /dev/null; then
	station_name=$(echo "$Input_RestAPI_Message" | jq -r '.list.now_stn')
	Eboard_SN=$(echo "$Input_RestAPI_Message" | jq -r '.list.equipment_fixture[-1].equipment_serial_number')
	Eboard=$(echo "$Input_RestAPI_Message" | jq -r '.list.equipment_fixture[-1].equipment_name')
	HS_QR_CODE=$(echo "$Input_RestAPI_Message" | jq -r '.list.replace_parts[-1].sn')
	part_number=$(echo "$Input_RestAPI_Message" | jq -r '.list.part_number')
	service_status=$(echo "$Input_RestAPI_Message" | jq -r '.list.is_serving')
	board_699pn=$(echo "$Input_RestAPI_Message" | jq -r '.list."699pn"')
	show_pass_msg "$1 Get data information from wareconn!!!"
else	
	show_fail_message "$Input_RestAPI_Message"
	show_fail_message "$1 Get Data information from Wareconn Fail Please call TE"
	exit 1
fi	


}